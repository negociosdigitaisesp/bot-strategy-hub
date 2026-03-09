import psycopg2
import sys

db_url = "postgresql://postgres:1CIwYGQv09MUQA@db.ypqekkkrfklaqlzhkbwg.supabase.co:5432/postgres"

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    cursor.execute("SELECT pg_get_viewdef('hft_lake.vw_grade_unificada');")
    view_def = cursor.fetchone()[0]
    if "rn" in view_def and "rn = 1" in view_def:
        print("VERIFIED_OK")
    else:
        print("VERIFICATION_FAILED:\n", view_def)
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Erro: {e}")
    sys.exit(1)
