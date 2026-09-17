import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS contas (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(50) NOT NULL UNIQUE,
      tipo VARCHAR(20) NOT NULL,
      saldo_inicial NUMERIC(10, 2) DEFAULT 0.00,
      limite_total NUMERIC(10, 2) DEFAULT 0.00,
      dia_fechamento INT DEFAULT 15,
      dia_vencimento INT DEFAULT 25,
      cor VARCHAR(20) DEFAULT 'purple'
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS transacoes (
      id SERIAL PRIMARY KEY,
      tipo VARCHAR(10) NOT NULL,
      valor NUMERIC(10, 2) NOT NULL,
      descricao VARCHAR(255) NOT NULL,
      categoria VARCHAR(50) NOT NULL,
      banco VARCHAR(50) NOT NULL,
      data DATE NOT NULL,
      pago BOOLEAN DEFAULT TRUE,
      is_fixo BOOLEAN DEFAULT FALSE,
      parcela_atual INT DEFAULT 1,
      total_parcelas INT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
}

export async function GET() {
  try {
    await initDb();
    const transacoes = await sql`SELECT * FROM transacoes ORDER BY data DESC, id DESC;`;
    const contas = await sql`SELECT * FROM contas ORDER BY id ASC;`;
    
    return NextResponse.json({
      transacoes: transacoes.rows,
      contas: contas.rows
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await initDb();

    // Toggle de status Pago
    if (body.acao === 'toggle_pago') {
      const { id, pago } = body;
      const result = await sql`
        UPDATE transacoes SET pago = ${pago} WHERE id = ${id} RETURNING *;
      `;
      return NextResponse.json(result.rows[0]);
    }

    // AÇÃO DE PAGAR FATURA DO CARTÃO
    if (body.acao === 'pagar_fatura') {
      const { nomeCartao, contaPagamento, valorTotal, dataPagamento } = body;

      // 1. Marca as despesas daquele cartão no mês como pagas
      const mesAtual = new Date(dataPagamento).toISOString().slice(0, 7);
      await sql`
        UPDATE transacoes 
        SET pago = TRUE 
        WHERE LOWER(banco) = LOWER(${nomeCartao}) 
          AND tipo = 'saida' 
          AND TO_CHAR(data, 'YYYY-MM') = ${mesAtual};
      `;

      // 2. Gera o registro de saída do saldo da conta corrente (Itaú/PagBank)
      await sql`
        INSERT INTO transacoes (tipo, valor, descricao, categoria, banco, data, pago)
        VALUES ('saida', ${parseFloat(valorTotal)}, ${`Pagamento Fatura ${nomeCartao}`}, 'Cartões', ${contaPagamento}, ${dataPagamento}, TRUE);
      `;

      return NextResponse.json({ success: true });
    }

    // Criar Nova Conta / Cartão
    if (body.acao === 'criar_conta') {
      const { nome, tipo, saldo_inicial, limite_total, dia_fechamento, dia_vencimento } = body;
      const result = await sql`
        INSERT INTO contas (nome, tipo, saldo_inicial, limite_total, dia_fechamento, dia_vencimento)
        VALUES (${nome}, ${tipo}, ${saldo_inicial || 0}, ${limite_total || 0}, ${dia_fechamento || 15}, ${dia_vencimento || 25})
        RETURNING *;
      `;
      return NextResponse.json(result.rows[0]);
    }

    // Transferência entre contas
    if (body.acao === 'transferencia') {
      const { contaOrigem, contaDestino, valor, data } = body;
      const valorNum = parseFloat(valor);

      await sql`
        INSERT INTO transacoes (tipo, valor, descricao, categoria, banco, data, pago)
        VALUES ('saida', ${valorNum}, ${`Transferência para ${contaDestino}`}, 'Transferência', ${contaOrigem}, ${data}, TRUE);
      `;

      await sql`
        INSERT INTO transacoes (tipo, valor, descricao, categoria, banco, data, pago)
        VALUES ('entrada', ${valorNum}, ${`Transferência de ${contaOrigem}`}, 'Transferência', ${contaDestino}, ${data}, TRUE);
      `;

      return NextResponse.json({ success: true });
    }

    // Criar Compra Parcelada
    if (body.acao === 'criar_parcelado') {
      const { valor_total, total_parcelas, descricao, categoria, banco, data_primeira, pago } = body;
      const valorParcela = (parseFloat(valor_total) / parseInt(total_parcelas)).toFixed(2);
      
      const parcelasCriadas = [];
      let dataParcela = new Date(data_primeira);

      for (let i = 1; i <= parseInt(total_parcelas); i++) {
        const dataFormatada = dataParcela.toISOString().split('T')[0];
        
        const res = await sql`
          INSERT INTO transacoes (tipo, valor, descricao, categoria, banco, data, pago, parcela_atual, total_parcelas)
          VALUES ('saida', ${valorParcela}, ${`${descricao} (${i}/${total_parcelas})`}, ${categoria}, ${banco}, ${dataFormatada}, ${i === 1 ? pago : false}, ${i}, ${total_parcelas})
          RETURNING *;
        `;
        parcelasCriadas.push(res.rows[0]);

        dataParcela.setMonth(dataParcela.getMonth() + 1);
      }

      return NextResponse.json(parcelasCriadas);
    }

    // Lançamento Padrão
    const { tipo, valor, descricao, categoria, banco, data, pago, is_fixo } = body;
    const result = await sql`
      INSERT INTO transacoes (tipo, valor, descricao, categoria, banco, data, pago, is_fixo)
      VALUES (${tipo}, ${valor}, ${descricao}, ${categoria}, ${banco}, ${data}, ${pago ?? true}, ${is_fixo || false})
      RETURNING *;
    `;

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao processar requisição' }, { status: 500 });
  }
}