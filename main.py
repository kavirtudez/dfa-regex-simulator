from flask import Flask, render_template, request, jsonify, send_from_directory
import os
from logic.simulate_dfa import DFASimulator
import shutil

app = Flask(__name__)

# Configure paths
FRAMES_DIR = os.path.join(os.path.dirname(__file__), 'static', 'frames')
os.makedirs(FRAMES_DIR, exist_ok=True)

# Preset regex patterns
PRESET_REGEX = {
    'preset1': '(1|0)*(11|00|101|010)(11|00)*(11|00|0|1)(1|0|11)(11|00)*(101|000|111)(1|0)*(101|000|111|001|100)(11|00|1|0)*',
    'preset2': '(a|b)*(aa|bb)(aa|bb)*(ab|ba|aba)(bab|aba|bbb)(a|b|bb|aa)*(bb|aa|aba)(aaa|bab|bba)(aaa|bab|bba)*'
}

@app.route('/')
def index():
    return render_template('index.html', presets=PRESET_REGEX)

@app.route('/api/draw_dfa', methods=['POST'])
def draw_dfa():
    """Generate and return the initial DFA diagram for a given regex."""
    data = request.get_json()
    regex = data.get('regex')
    
    if not regex:
        return jsonify({'error': 'Missing regex'}), 400
    
    try:
        simulator = DFASimulator()
        image_path = simulator.generate_static_dfa_image(regex)
        return jsonify({'image_url': f'/static/frames/{os.path.basename(image_path)}'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/simulate', methods=['POST'])
def simulate():
    """Handle DFA simulation request."""
    data = request.get_json()
    regex = data.get('regex')
    input_str = data.get('input_string')
    
    if not regex or not input_str:
        return jsonify({'error': 'Missing regex or input string'}), 400
    
    try:
        simulator = DFASimulator()
        result = simulator.simulate(regex, input_str)
        
        # Get frame URLs
        frame_urls = []
        for file in sorted(os.listdir(FRAMES_DIR)):
            if file.startswith('frame_') and file.endswith('.png'):
                frame_urls.append(f'/static/frames/{file}')
        
        result['frame_urls'] = frame_urls
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)