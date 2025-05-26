from flask import Blueprint, request, jsonify, send_from_directory, render_template, url_for
import os
import logging
from app.automata.dfa_simulator import DFASimulator

main = Blueprint('main', __name__)
logger = logging.getLogger(__name__)

# Get the absolute path to the dfa_frames directory
FRAMES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dfa_frames")
os.makedirs(FRAMES_DIR, exist_ok=True)

@main.route("/")
def index():
    return render_template("index.html")

@main.route("/dfa_frames/<filename>")
def serve_frame(filename):
    try:
        return send_from_directory(FRAMES_DIR, filename)
    except Exception as e:
        logger.error(f"Frame not found: {os.path.join(FRAMES_DIR, filename)}")
        return jsonify({"error": "Frame not found"}), 404

@main.route("/api/draw_dfa", methods=["POST"])
def api_draw_dfa():
    data = request.json
    regex = data.get("regex")
    if not regex:
        return jsonify({"error": "Missing regex"}), 400
    
    try:
        simulator = DFASimulator()
        image_filename = "dfa_diagram.png"
        simulator.generate_static_dfa_image(regex, image_filename)
        return jsonify({"image_url": f"/dfa_frames/{image_filename}"})
    except Exception as e:
        logger.error(f"Error drawing DFA: {str(e)}")
        return jsonify({"error": str(e)}), 400

@main.route("/simulate", methods=["POST"])
def simulate():
    """Handle DFA simulation request."""
    data = request.get_json()
    regex = data.get('regex')
    input_str = data.get('input_string')
    
    if not regex or not input_str:
        return jsonify({'error': 'Missing regex or input string'}), 400
    
    try:
        # Create simulator instance
        simulator = DFASimulator()
        
        # Run simulation
        result = simulator.simulate(regex, input_str)
        
        # Get frame URLs
        frame_urls = []
        for file in sorted(os.listdir(FRAMES_DIR)):
            if file.startswith('frame_') and file.endswith('.png'):
                frame_urls.append(url_for('main.serve_frame', filename=file))
        
        result['frame_urls'] = frame_urls
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error during simulation: {str(e)}")
        return jsonify({'error': str(e)}), 500 