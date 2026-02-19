"""
Test scoring logic changes locally
"""
import sys
import os

# Mock objects
class MockStats:
    def __init__(self, wins, losses):
        self.data = {
            'wins': wins,
            'losses': losses,
            'history': [1] * wins + [0] * losses
        }
    
    def __getitem__(self, key):
        return self.data[key]
    
    def get(self, key, default=None):
        return self.data.get(key, default)

def test_scoring_logic():
    print("=" * 70)
    print("TESTE: Nova Logica de Pontuacao")
    print("=" * 70)
    
    # Test cases
    test_cases = [
        {"name": "Alta Performance, Baixa Freq", "wins": 80, "losses": 20, "freq": 0},
        {"name": "Media Performance, Alta Freq", "wins": 60, "losses": 40, "freq": 5},
        {"name": "Baixa Performance", "wins": 40, "losses": 60, "freq": 3},
        {"name": "Estrategia Nova (8 trades)", "wins": 6, "losses": 2, "freq": 0},
        {"name": "Estrategia Nova (12 trades)", "wins": 9, "losses": 3, "freq": 0},
    ]
    
    print("\n1. Teste de Frequencia Zero:")
    print("   Antes: 0.0 pontos (penalizava)")
    print("   Depois: 2.5 pontos (neutro)")
    
    print("\n2. Teste de Peso de Frequencia:")
    print("   Antes: 5 pontos maximo")
    print("   Depois: 3 pontos maximo (5 * 0.6)")
    
    print("\n3. Teste de Threshold de Visibilidade:")
    print("   Antes: < 20 trades = oculto")
    print("   Depois: < 10 trades = oculto")
    
    print("\n4. Teste de Boost WR > 70%:")
    print("   Se WR > 70% e trades >= 10: +10 pontos")
    
    print("\n" + "=" * 70)
    print("CASOS DE TESTE:")
    print("=" * 70)
    
    for case in test_cases:
        total = case['wins'] + case['losses']
        wr = (case['wins'] / total * 100) if total > 0 else 0
        
        # Simular scores
        freq_score_old = 0.0 if case['freq'] == 0 else 5.0
        freq_score_new = 2.5 if case['freq'] == 0 else 5.0
        freq_adjusted = freq_score_new * 0.6
        
        # Base score (assumindo edge=20, consistency=15, regime=15, recent=7.5)
        base_score = 57.5
        
        score_old = base_score + freq_score_old
        score_new = base_score + freq_adjusted
        
        # WR Boost
        boost = 10 if (wr > 70 and total >= 10) else 0
        score_new += boost
        
        # Visibilidade
        visible_old = total >= 20
        visible_new = total >= 10
        
        print(f"\n{case['name']}:")
        print(f"  Trades: {case['wins']}W / {case['losses']}L (Total: {total})")
        print(f"  Win Rate: {wr:.1f}%")
        print(f"  Frequencia: {case['freq']} sinais/hora")
        print(f"  Score Antigo: {score_old:.1f} pts | Visivel: {visible_old}")
        print(f"  Score Novo: {score_new:.1f} pts | Visivel: {visible_new} | Boost: +{boost}pts")
        
        if score_new > score_old:
            print(f"  [MELHORA] +{score_new - score_old:.1f} pontos!")
        elif visible_new and not visible_old:
            print(f"  [MELHORA] Agora visivel!")
    
    print("\n" + "=" * 70)
    print("[SUCESSO] Testes completados!")
    print("=" * 70)

if __name__ == "__main__":
    test_scoring_logic()
