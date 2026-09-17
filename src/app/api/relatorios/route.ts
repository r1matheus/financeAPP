import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Agrupamento por Categoria (Gastos Efetivados do Mês Atual)
    const porCategoria = await sql`
      SELECT 
        categoria, 
        SUM(valor) as total 
      FROM transacoes 
      WHERE tipo = 'saida' AND pago = TRUE
      GROUP BY categoria 
      ORDER BY total DESC;
    `;

    // Totais Gerais Efetivados
    const totais = await sql`
      SELECT 
        SUM(CASE WHEN tipo = 'entrada' AND pago = TRUE THEN valor ELSE 0 END) as entradas,
        SUM(CASE WHEN tipo = 'saida' AND pago = TRUE THEN valor ELSE 0 END) as saidas
      FROM transacoes;
    `;

    return NextResponse.json({
      porCategoria: porCategoria.rows,
      totais: totais.rows[0]
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 });
  }
}