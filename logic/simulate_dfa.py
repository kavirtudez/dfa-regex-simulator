from automata.fa.nfa import NFA
from automata.fa.dfa import DFA
import graphviz
import os
import logging

class DFASimulator:
    def __init__(self):
        """Initialize the DFA simulator."""
        self.frames_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'frames')
        os.makedirs(self.frames_dir, exist_ok=True)
        
        # Configure logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # Configure Graphviz
        self.dot = graphviz.Digraph(comment='DFA Visualization')
        self.dot.attr(rankdir='LR')
    
    def regex_to_dfa(self, regex):
        """Convert regex to DFA."""
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
    
    def draw_dfa(self, dfa, current_state=None, current_symbol=None, input_string=None):
        """Draw the DFA using Graphviz."""
        dot = graphviz.Digraph(comment='DFA Visualization')
        dot.attr(rankdir='LR')
        
        # Sort states to ensure consistent ordering
        sorted_states = sorted(dfa.states, key=lambda x: str(x))
        
        # Add states with consistent labels
        for state in sorted_states:
            state_label = self.normalize_state(state)
            if state == current_state:
                # Highlight current state
                dot.node(str(state), state_label, 
                        shape='doublecircle' if state in dfa.final_states else 'circle',
                        style='filled', fillcolor='#3498db', fontcolor='white')
            elif state == dfa.initial_state:
                # Highlight start state
                dot.node(str(state), state_label,
                        shape='doublecircle' if state in dfa.final_states else 'circle',
                        style='filled', fillcolor='#2ecc71', fontcolor='white')
            elif state in dfa.final_states:
                # Highlight final states
                dot.node(str(state), state_label,
                        shape='doublecircle',
                        style='filled', fillcolor='#e74c3c', fontcolor='white')
            else:
                dot.node(str(state), state_label,
                        shape='circle')
        
        # Sort transitions for consistent ordering
        for src in sorted(dfa.transitions.keys()):
            for symbol, dst in sorted(dfa.transitions[src].items()):
                if src == current_state and symbol == current_symbol:
                    # Highlight current transition
                    dot.edge(str(src), str(dst), label=symbol, color='#3498db', penwidth='2.0')
                else:
                    dot.edge(str(src), str(dst), label=symbol)
        
        # Set layout engine to dot for consistent positioning
        dot.attr(layout='dot')
        
        return dot
    
    def get_dfa_info(self, dfa):
        """Get detailed information about the DFA."""
        return {
            'total_states': len(dfa.states),
            'final_states': [self.normalize_state(s) for s in sorted(dfa.final_states)],
            'start_state': self.normalize_state(dfa.initial_state),
            'alphabet': sorted(list(dfa.input_symbols))
        }
    
    def generate_static_dfa_image(self, regex, output_filename='dfa_diagram.png'):
        """Generate a static DFA diagram from regex."""
        dfa = self.regex_to_dfa(regex)
        dot = self.draw_dfa(dfa)
        output_path = os.path.join(self.frames_dir, output_filename)
        dot.render(output_path.replace('.png', ''), format='png', cleanup=True)
        return output_path
    
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
        
        # Get DFA information
        dfa_info = self.get_dfa_info(dfa)
        
        return {
            'accepted': current_state in dfa.final_states,
            'final_state': self.normalize_state(current_state),
            'path': [(self.normalize_state(s), sym, self.normalize_state(d)) for s, sym, d in path],
            'dfa_info': dfa_info
        } 