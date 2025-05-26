from flask import Flask
import os
import logging

def create_app():
    app = Flask(__name__)
    
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Ensure frames directory exists
    FRAMES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dfa_frames")
    os.makedirs(FRAMES_DIR, exist_ok=True)
    
    # Register blueprints
    from app.routes import main
    app.register_blueprint(main)
    
    return app 