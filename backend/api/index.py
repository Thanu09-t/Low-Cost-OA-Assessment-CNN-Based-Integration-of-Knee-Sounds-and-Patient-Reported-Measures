import os
import sys

# Ensure the root of the backend folder is added to sys.path
# so that the local 'app' package imports resolve correctly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
