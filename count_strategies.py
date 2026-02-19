import os

STRATEGIES_PATH = r"c:\Users\bialo\OneDrive\Documentos\beckbug\million_bots_vps\strategies\tier1"
current_count = len([f for f in os.listdir(STRATEGIES_PATH) if f.endswith('.py') and f != '__init__.py'])

target = 15
to_generate = max(0, target - current_count)
to_remove = max(0, current_count - target)

print(f"Estrategias atuais: {current_count}")
print(f"Estrategias a gerar: {to_generate}")
print(f"Estrategias a remover: {to_remove}")

if to_remove > 0:
    print(f"\nDecisao: Ainda temos {current_count} estrategias. Precisamos remover mais {to_remove}.")
elif to_generate > 0:
    print(f"\nDecisao: Gerar {to_generate} novas estrategias.")
else:
    print(f"\nDecisao: Quantidade OK! Exatamente {target} estrategias.")
