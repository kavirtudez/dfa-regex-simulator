from automata.fa.nfa import NFA
from automata.fa.dfa import DFA
from graphviz import Digraph
import os
from flask import current_app
import uuid
import shutil
import subprocess
import sys
from PIL import Image
import logging
import graphviz
import glob

FRAMES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../dfa_frames'))
os.makedirs(FRAMES_DIR, exist_ok=True)

class DFASimulator:
    PRESET_IMAGES = [
        ("dfa_preset1.png", '(1|0)*(11|00|101|010)(11|00)*(11|00|0|1)(1|0|11)(11|00)*(101|000|111)(1|0)*(101|000|111|001|100)(11|00|1|0)*'),
        ("dfa_preset2.png", '(a|b)*(aa|bb)(aa|bb)*(ab|ba|aba)(bab|aba|bbb)(a|b|bb|aa)*(bb|aa|aba)(aaa|bab|bba)(aaa|bab|bba)*')
    ]

    def __init__(self):
        for noisy in ['pydot', 'graphviz', 'PIL', 'PIL.PngImagePlugin']:
            logging.getLogger(noisy).setLevel(logging.INFO)
        self.frames_dir = FRAMES_DIR
        os.makedirs(self.frames_dir, exist_ok=True)
        self._cleanup_old_images()
        self._configure_graphviz()
        self._ensure_preset_images()

    def _ensure_preset_images(self):
        for fname, regex in self.PRESET_IMAGES:
            path = os.path.join(self.frames_dir, fname)
            if not os.path.exists(path):
                print(f"[DFA] Generating missing preset DFA image: {os.path.abspath(path)}")
                self.generate_static_dfa_image(regex, fname)

    def _relabel_states(self, dfa):
        sorted_states = sorted(dfa.states, key=lambda s: str(s))
        state_map = {state: f'q{idx}' for idx, state in enumerate(sorted_states)}
        return state_map

    def _configure_graphviz(self):
        try:
            dot_path = shutil.which('dot')
            if dot_path:
                os.environ['PATH'] = os.path.dirname(dot_path) + os.pathsep + os.environ['PATH']
                current_app.logger.info(f"Found Graphviz at: {dot_path}")
                self._test_graphviz_installation(dot_path)
            else:
                current_app.logger.warning("Graphviz 'dot' executable not found in PATH")
                current_app.logger.debug(f"Current PATH: {os.environ.get('PATH', '')}")
        except Exception as e:
            current_app.logger.error(f"Error configuring Graphviz: {str(e)}")

    def _test_graphviz_installation(self, dot_path):
        try:
            test_dot = "digraph { A -> B }"
            test_file = os.path.join(self.frames_dir, "test.dot")
            test_output = os.path.join(self.frames_dir, "test.png")
            with open(test_file, 'w') as f:
                f.write(test_dot)
            result = subprocess.run(
                [dot_path, '-Tpng', test_file, '-o', test_output],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                current_app.logger.error(f"Graphviz test failed: {result.stderr}")
            else:
                current_app.logger.info("Graphviz test successful")
            try:
                os.remove(test_file)
                os.remove(test_output)
            except OSError:
                pass
        except Exception as e:
            current_app.logger.error(f"Error testing Graphviz: {str(e)}")

    def _cleanup_old_images(self):
        for filename in os.listdir(self.frames_dir):
            if filename.startswith('frame_') and filename.endswith('.png'):
                try:
                    os.remove(os.path.join(self.frames_dir, filename))
                except OSError:
                    pass

    def regex_to_dfa(self, regex):
        # Replace '+' with '|' for alternation
        regex = regex.replace('+', '|')
        nfa = NFA.from_regex(regex)
        dfa = DFA.from_nfa(nfa)
        return dfa

    def normalize_state(self, state):
        """Normalize state representation for display."""
        if isinstance(state, frozenset):
            return f"q{hash(state) % 1000}"
        return str(state)

    def generate_static_dfa_image(self, regex, output_filename):
        """Generate a static DFA diagram from regex."""
        dfa = self.regex_to_dfa(regex)
        self.draw_dfa(dfa, os.path.join(self.frames_dir, output_filename.replace('.png', '')))
        return output_filename

    def draw_dfa(self, dfa, current_state=None, current_symbol=None, input_string=None):
        """Draw the DFA using Graphviz"""
        dot = graphviz.Digraph(comment='DFA Visualization')
        dot.attr(rankdir='LR')
        
        # Add states
        for state in dfa.states:
            if state == current_state:
                # Highlight current state
                dot.node(str(state), self.normalize_state(state), 
                        shape='doublecircle' if state in dfa.final_states else 'circle',
                        style='filled', fillcolor='#3498db', fontcolor='white')
            else:
                dot.node(str(state), self.normalize_state(state),
                        shape='doublecircle' if state in dfa.final_states else 'circle')
        
        # Add transitions
        for src in dfa.transitions:
            for symbol, dst in dfa.transitions[src].items():
                if src == current_state and symbol == current_symbol:
                    # Highlight current transition
                    dot.edge(str(src), str(dst), label=symbol, color='#3498db', penwidth='2.0')
                else:
                    dot.edge(str(src), str(dst), label=symbol)
        
        # Add input string visualization if provided
        if input_string:
            input_dot = graphviz.Digraph('input_string')
            input_dot.attr(rankdir='LR')
            
            # Add input string with current symbol highlighted
            for i, char in enumerate(input_string):
                if i == len(input_string) - 1 and char == current_symbol:
                    input_dot.node(f'char_{i}', char, style='filled', fillcolor='#3498db', fontcolor='white')
                else:
                    input_dot.node(f'char_{i}', char)
                if i < len(input_string) - 1:
                    input_dot.edge(f'char_{i}', f'char_{i+1}')
            
            # Combine the graphs
            dot.subgraph(input_dot)
        
        return dot

    def simulate(self, regex, input_str):
        """Simulate DFA on input string and generate visualization frames."""
        # Clear previous frames
        for file in os.listdir(self.frames_dir):
            if file.startswith('frame_') and file.endswith('.png'):
                os.remove(os.path.join(self.frames_dir, file))
        
        # Convert regex to DFA
        dfa = self.regex_to_dfa(regex)
        
        # Generate initial frame
        initial_dot = self.draw_dfa(dfa)
        initial_dot.render(os.path.join(self.frames_dir, 'frame_000'), format='png', cleanup=True)
        
        # Simulate DFA
        current_state = dfa.initial_state
        path = []
        frame_count = 1
        
        for i, symbol in enumerate(input_str):
            if symbol not in dfa.input_symbols:
                return {
                    'accepted': False,
                    'final_state': self.normalize_state(current_state),
                    'path': [(self.normalize_state(s), sym, self.normalize_state(d)) for s, sym, d in path],
                    'error': f'Invalid symbol: {symbol}'
                }
            
            if current_state not in dfa.transitions or symbol not in dfa.transitions[current_state]:
                return {
                    'accepted': False,
                    'final_state': self.normalize_state(current_state),
                    'path': [(self.normalize_state(s), sym, self.normalize_state(d)) for s, sym, d in path],
                    'error': f'No transition for symbol {symbol} from state {self.normalize_state(current_state)}'
                }
            
            next_state = dfa.transitions[current_state][symbol]
            path.append((current_state, symbol, next_state))
            
            # Generate frame for this step
            dot = self.draw_dfa(dfa, current_state, symbol, input_str)
            frame_path = os.path.join(self.frames_dir, f'frame_{frame_count:03d}')
            dot.render(frame_path, format='png', cleanup=True)
            frame_count += 1
            
            current_state = next_state
        
        # Generate final frame
        final_dot = self.draw_dfa(dfa, current_state, None, input_str)
        final_dot.render(os.path.join(self.frames_dir, f'frame_{frame_count:03d}'), format='png', cleanup=True)
        
        return {
            'accepted': current_state in dfa.final_states,
            'final_state': self.normalize_state(current_state),
            'path': [(self.normalize_state(s), sym, self.normalize_state(d)) for s, sym, d in path]
        }

def create_gif_from_frames(frames_dir, output_file='dfa_animation.gif', duration=100):
    """Creates an animated GIF from PNG frames in the specified directory."""
    frames = []
    files = sorted(glob.glob(os.path.join(frames_dir, 'frame_*.png')), 
                  key=lambda x: int(os.path.splitext(os.path.basename(x))[0].split('_')[1]))
    for file in files:
        frames.append(Image.open(file))
    if frames:
        frames[0].save(
            output_file,
            save_all=True,
            append_images=frames[1:],
            duration=duration,
            loop=0
        ) 