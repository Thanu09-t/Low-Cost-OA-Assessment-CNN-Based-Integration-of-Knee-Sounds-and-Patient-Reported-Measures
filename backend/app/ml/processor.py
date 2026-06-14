import os
import numpy as np
import pandas as pd
import scipy.signal as signal
from scipy.io import wavfile
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt

# Try importing librosa, fall back if not available
try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False

class SignalProcessor:
    def __init__(self, target_sr=2000):
        self.target_sr = target_sr

    def load_signal(self, file_path: str) -> tuple[np.ndarray, int]:
        """
        Loads signal from .wav or .csv.
        Returns: (1D numpy array of signal amplitudes, sampling rate)
        """
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == '.wav':
            if LIBROSA_AVAILABLE:
                try:
                    # Librosa loads as float and handles resampling
                    y, sr = librosa.load(file_path, sr=self.target_sr)
                    return y, sr
                except Exception:
                    pass
            
            # Scipy fallback for WAV
            sr, y = wavfile.read(file_path)
            # Convert to float and mono
            if y.ndim > 1:
                y = np.mean(y, axis=1)
            y = y.astype(float)
            # Normalize to [-1.0, 1.0] if integer type
            if np.issubdtype(y.dtype, np.integer):
                y = y / np.iinfo(y.dtype).max
            return y, sr
            
        elif ext == '.csv':
            # Load CSV (assumed single column or time,amplitude columns)
            df = pd.read_csv(file_path)
            # If multiple columns, find a numeric one
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                # Use first numeric column
                y = df[numeric_cols[0]].values
            else:
                raise ValueError("No numeric data found in CSV file")
            
            # Default sampling rate for wearable sensor CSV files if not specified
            sr = self.target_sr
            return y, sr
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    def filter_noise(self, y: np.ndarray, sr: int, lowcut=50, highcut=1000) -> np.ndarray:
        """
        Applies a Butterworth bandpass filter to remove sensor noise and low frequency body hums.
        """
        nyquist = 0.5 * sr
        low = lowcut / nyquist
        high = highcut / nyquist
        
        # Ensure cutoffs are valid for Nyquist frequency
        if low >= 1.0:
            low = 0.01
        if high >= 1.0:
            high = 0.99
            
        b, a = signal.butter(4, [low, high], btype='band')
        filtered_y = signal.filtfilt(b, a, y)
        return filtered_y

    def normalize(self, y: np.ndarray) -> np.ndarray:
        """
        Applies peak normalization.
        """
        max_val = np.max(np.abs(y))
        if max_val > 0:
            return y / max_val
        return y

    def segment_signal(self, y: np.ndarray, sr: int, segment_length_sec=1.0) -> list[np.ndarray]:
        """
        Segments the continuous signal into small window frames (e.g. 1 second).
        """
        samples_per_seg = int(segment_length_sec * sr)
        segments = []
        for i in range(0, len(y), samples_per_seg):
            segment = y[i:i + samples_per_seg]
            if len(segment) == samples_per_seg:
                segments.append(segment)
        if not segments:
            # If signal is too short, return the signal padded
            padded = np.pad(y, (0, max(0, samples_per_seg - len(y))), 'constant')
            segments.append(padded)
        return segments

    def generate_spectrogram(self, y: np.ndarray, sr: int) -> np.ndarray:
        """
        Generates a 2D Mel-spectrogram matrix.
        Returns: (n_mels, time_steps) matrix in decibels.
        """
        if LIBROSA_AVAILABLE:
            # Generate Mel spectrogram
            S = librosa.feature.melspectrogram(y=y, sr=sr, n_fft=512, hop_length=128, n_mels=64)
            S_db = librosa.power_to_db(S, ref=np.max)
            return S_db
        else:
            # Fallback using scipy spectrogram
            f, t, Sxx = signal.spectrogram(y, fs=sr, nperseg=256, noverlap=128)
            # Log transform to decibels
            S_db = 10 * np.log10(Sxx + 1e-10)
            # Resize or return as-is
            return S_db

    def extract_features(self, y: np.ndarray, sr: int) -> dict:
        """
        Extracts key time-frequency clinical acoustic features.
        """
        features = {}
        
        # Time-domain features
        features['rms'] = float(np.sqrt(np.mean(y**2)))
        features['zcr'] = float(np.sum(librosa.feature.zero_crossing_rate(y)[0]) if LIBROSA_AVAILABLE else np.sum(np.diff(y > 0) != 0) / len(y))
        features['peak_to_peak'] = float(np.max(y) - np.min(y))
        
        # Frequency-domain features
        if LIBROSA_AVAILABLE:
            features['spectral_centroid'] = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
            features['spectral_rolloff'] = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.85)))
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            for i in range(13):
                features[f'mfcc_{i+1}'] = float(np.mean(mfccs[i]))
        else:
            # Fallback approximations
            fft_vals = np.abs(np.fft.rfft(y))
            fft_freqs = np.fft.rfftfreq(len(y), 1.0/sr)
            sum_fft = np.sum(fft_vals)
            if sum_fft > 0:
                features['spectral_centroid'] = float(np.sum(fft_freqs * fft_vals) / sum_fft)
            else:
                features['spectral_centroid'] = 0.0
            
            features['spectral_rolloff'] = float(features['spectral_centroid'] * 1.5)  # Simple fallback estimation
            # Mock MFCCs
            for i in range(13):
                features[f'mfcc_{i+1}'] = float(0.0)
                
        return features

    def generate_plots(self, raw_y: np.ndarray, proc_y: np.ndarray, spec: np.ndarray, sr: int, output_dir: str, prefix: str) -> dict:
        """
        Generates raw, processed, and spectrogram plots and saves them as images.
        """
        os.makedirs(output_dir, exist_ok=True)
        paths = {}
        
        # 1. Raw vs Processed signal graph
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 6))
        time_raw = np.arange(len(raw_y)) / sr
        ax1.plot(time_raw, raw_y, color='#64748B', alpha=0.8)
        ax1.set_title("Raw Knee Acoustic Emission Signal", fontsize=12, fontweight='bold', color='#1E293B')
        ax1.set_ylabel("Amplitude")
        ax1.grid(True, linestyle='--', alpha=0.5)
        
        time_proc = np.arange(len(proc_y)) / sr
        ax2.plot(time_proc, proc_y, color='#2563EB', alpha=0.9)
        ax2.set_title("Processed Signal (Noise-Filtered & Normalized)", fontsize=12, fontweight='bold', color='#1E293B')
        ax2.set_xlabel("Time (seconds)")
        ax2.set_ylabel("Amplitude")
        ax2.grid(True, linestyle='--', alpha=0.5)
        
        plt.tight_layout()
        signal_plot_path = os.path.join(output_dir, f"{prefix}_signals.png")
        plt.savefig(signal_plot_path, dpi=150, bbox_inches='tight')
        plt.close()
        paths['signals'] = signal_plot_path
        
        # 2. Spectrogram graph
        plt.figure(figsize=(10, 4))
        if LIBROSA_AVAILABLE:
            import librosa.display
            librosa.display.specshow(spec, sr=sr, x_axis='time', y_axis='mel', cmap='viridis')
            plt.colorbar(format='%+2.0f dB')
        else:
            plt.imshow(spec, aspect='auto', origin='lower', cmap='viridis', extent=[0, len(proc_y)/sr, 50, sr/2])
            plt.colorbar(label='Intensity (dB)')
            
        plt.title("Acoustic Joint Spectrogram (Time-Frequency)", fontsize=12, fontweight='bold', color='#1E293B')
        plt.xlabel("Time (seconds)")
        plt.ylabel("Frequency (Hz)")
        plt.tight_layout()
        spec_plot_path = os.path.join(output_dir, f"{prefix}_spectrogram.png")
        plt.savefig(spec_plot_path, dpi=150, bbox_inches='tight')
        plt.close()
        paths['spectrogram'] = spec_plot_path
        
        return paths
