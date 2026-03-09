import psycopg2
import sys

db_url = "postgresql://postgres:1CIwYGQv09MUQA@db.ypqekkkrfklaqlzhkbwg.supabase.co:5432/postgres"
sql_file = "c:/Users/brend/Videos/bot-strategy-hub/bot-strategy-hub/bot-strategy-hub/newimplement/banco de dados/08_view_grade_unificada.sql"

try:
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()
    cursor.execute(sql)
    print("View atualizada com sucesso no Supabase B!")
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Erro: {e}")
    sys.exit(1)
