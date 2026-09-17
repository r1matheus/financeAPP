'use client';

import { useState, useEffect } from 'react';
import { 
  Eye, EyeOff, RefreshCw, Plus, Minus, CreditCard, 
  Utensils, Home, Car, PartyPopper, Briefcase, TrendingUp, 
  Package, User, Landmark, PlusCircle, CheckCircle, Clock, Calendar,
  LayoutDashboard, BarChart3, ArrowRightLeft, DollarSign
} from 'lucide-react';

interface Transacao {
  id: number;
  tipo: 'entrada' | 'saida';
  valor: string;
  descricao: string;
  categoria: string;
  banco: string;
  data: string;
  pago: boolean;
  is_fixo: boolean;
  parcela_atual?: number;
  total_parcelas?: number;
}

interface Conta {
  id: number;
  nome: string;
  tipo: string;
  saldo_inicial: string;
  limite_total: string;
  dia_fechamento: number;
  dia_vencimento: number;
}

interface RelatorioCategoria {
  categoria: string;
  total: string;
}

export default function FinanceiroApp() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [relatorioCat, setRelatorioCat] = useState<RelatorioCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [esconderValores, setEsconderValores] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'inicio' | 'cartoes' | 'relatorios'>('inicio');

  // Modais
  const [mostrarFormTransacao, setMostrarFormTransacao] = useState(false);
  const [mostrarFormConta, setMostrarFormConta] = useState(false);
  const [mostrarFormTransferencia, setMostrarFormTransferencia] = useState(false);
  const [cartaoParaPagar, setCartaoParaPagar] = useState<Conta | null>(null);

  // Form Transação
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('saida');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('Alimentação');
  const [bancoSelecionado, setBancoSelecionado] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [pago, setPago] = useState(true);
  const [isFixo, setIsFixo] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [numVezes, setNumVezes] = useState('2');

  // Form Transferência / Pagamento
  const [contaOrigem, setContaOrigem] = useState('');
  const [contaDestino, setContaDestino] = useState('');
  const [valorTransferencia, setValorTransferencia] = useState('');
  const [contaPagamentoFatura, setContaPagamentoFatura] = useState('Itaú');

  // Form Conta/Cartão
  const [nomeConta, setNomeConta] = useState('');
  const [tipoConta, setTipoConta] = useState('Conta Corrente');
  const [saldoInicial, setSaldoInicial] = useState('');
  const [limiteTotal, setLimiteTotal] = useState('');
  const [diaFechamento, setDiaFechamento] = useState('15');
  const [diaVencimento, setDiaVencimento] = useState('25');

  const carregarDados = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/transacoes');
      const data = await res.json();
      if (data.transacoes) setTransacoes(data.transacoes);
      if (data.contas) {
        setContas(data.contas);
        if (data.contas.length > 0) {
          if (!bancoSelecionado) setBancoSelecionado(data.contas[0].nome);
          if (!contaOrigem) setContaOrigem(data.contas[0].nome);
          if (!contaDestino) setContaDestino(data.contas[1]?.nome || data.contas[0].nome);
        }
      }

      const resRel = await fetch('/api/relatorios');
      const dataRel = await resRel.json();
      if (dataRel.porCategoria) setRelatorioCat(dataRel.porCategoria);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const toggleStatusPago = async (id: number, statusAtual: boolean) => {
    try {
      await fetch('/api/transacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'toggle_pago', id, pago: !statusAtual })
      });
      carregarDados();
    } catch (err) { alert('Erro ao alterar status!'); }
  };

  const handleSalvarTransacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valor || !descricao) return alert('Informe valor e descrição!');

    try {
      let payload: any = {
        tipo,
        valor: parseFloat(valor),
        descricao,
        categoria,
        banco: bancoSelecionado || 'Itaú',
        data,
        pago,
        is_fixo: isFixo
      };

      if (isRepeat && tipo === 'saida') {
        payload = {
          acao: 'criar_parcelado',
          valor_total: parseFloat(valor),
          total_parcelas: parseInt(numVezes),
          descricao,
          categoria,
          banco: bancoSelecionado || 'Atacadão',
          data_primeira: data,
          pago
        };
      }

      const res = await fetch('/api/transacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setValor(''); setDescricao(''); setIsRepeat(false); setIsFixo(false);
        setMostrarFormTransacao(false); carregarDados();
      }
    } catch (err) { alert('Erro ao salvar!'); }
  };

  const handlePagarFatura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cartaoParaPagar) return;

    const valorFatura = calcularFaturaAtual(cartaoParaPagar);
    if (valorFatura <= 0) return alert('Este cartão não possui fatura pendente!');

    try {
      const res = await fetch('/api/transacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'pagar_fatura',
          nomeCartao: cartaoParaPagar.nome,
          contaPagamento: contaPagamentoFatura,
          valorTotal: valorFatura,
          dataPagamento: data
        })
      });

      if (res.ok) {
        setCartaoParaPagar(null);
        carregarDados();
      }
    } catch (err) {
      alert('Erro ao processar pagamento da fatura!');
    }
  };

  const handleTransferencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valorTransferencia || contaOrigem === contaDestino) {
      return alert('Informe um valor válido e selecione contas diferentes!');
    }

    try {
      const res = await fetch('/api/transacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'transferencia',
          contaOrigem,
          contaDestino,
          valor: parseFloat(valorTransferencia),
          data
        })
      });

      if (res.ok) {
        setValorTransferencia('');
        setMostrarFormTransferencia(false);
        carregarDados();
      }
    } catch (err) { alert('Erro ao realizar transferência!'); }
  };

  const handleCriarConta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeConta) return alert('Informe o nome!');

    try {
      const res = await fetch('/api/transacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'criar_conta',
          nome: nomeConta,
          tipo: tipoConta,
          saldo_inicial: parseFloat(saldoInicial) || 0,
          limite_total: parseFloat(limiteTotal) || 0,
          dia_fechamento: parseInt(diaFechamento) || 15,
          dia_vencimento: parseInt(diaVencimento) || 25
        })
      });

      if (res.ok) {
        setNomeConta(''); setSaldoInicial(''); setLimiteTotal('');
        setMostrarFormConta(false); carregarDados();
      }
    } catch (err) { alert('Erro ao criar conta!'); }
  };

  const calcularFaturaAtual = (conta: Conta) => {
    const mesAtual = new Date().toISOString().slice(0, 7);
    return transacoes
      .filter(t => t.banco.toLowerCase() === conta.nome.toLowerCase() && t.tipo === 'saida' && !t.pago && t.data.startsWith(mesAtual))
      .reduce((acc, t) => acc + Number(t.valor), 0);
  };

  const calcularTotalComprometidoCartao = (conta: Conta) => {
    return transacoes
      .filter(t => t.banco.toLowerCase() === conta.nome.toLowerCase() && t.tipo === 'saida' && !t.pago)
      .reduce((acc, t) => acc + Number(t.valor), 0);
  };

  const calcularSaldoConta = (conta: Conta) => {
    const inicial = Number(conta.saldo_inicial) || 0;
    const movimentacoes = transacoes
      .filter(t => t.banco.toLowerCase() === conta.nome.toLowerCase() && t.pago)
      .reduce((acc, t) => acc + (t.tipo === 'entrada' ? Number(t.valor) : -Number(t.valor)), 0);
    return inicial + movimentacoes;
  };

  const contasBancarias = contas.filter(c => c.tipo !== 'Cartao de Credito');
  const cartoesCredito = contas.filter(c => c.tipo === 'Cartao de Credito');
  const saldoTotalPatrimonio = contasBancarias.reduce((acc, c) => acc + calcularSaldoConta(c), 0);

  const totalGastoCartoes = cartoesCredito.reduce((acc, c) => acc + calcularFaturaAtual(c), 0);
  const totalLimites = cartoesCredito.reduce((acc, c) => acc + Number(c.limite_total || 0), 0);

  const mesAtual = new Date().toISOString().slice(0, 7);
  const transacoesDoMes = transacoes.filter(t => t.data.startsWith(mesAtual));
  const totalEntradas = transacoesDoMes.filter(t => t.tipo === 'entrada' && t.pago && t.categoria !== 'Transferência').reduce((acc, t) => acc + Number(t.valor), 0);
  const totalSaidas = transacoesDoMes.filter(t => t.tipo === 'saida' && t.pago && t.categoria !== 'Transferência').reduce((acc, t) => acc + Number(t.valor), 0);
  const balancoMes = totalEntradas - totalSaidas;

  const totalGastosEfetivadosRelatorio = relatorioCat.filter(c => c.categoria !== 'Transferência').reduce((acc, c) => acc + Number(c.total), 0);

  const formatarValor = (val: number) => {
    if (esconderValores) return 'R$ •••••';
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getIcone = (cat: string) => {
    switch (cat) {
      case 'Alimentação': return <Utensils size={18} className="text-amber-500" />;
      case 'Moradia': return <Home size={18} className="text-blue-500" />;
      case 'Transporte': return <Car size={18} className="text-purple-500" />;
      case 'Lazer': return <PartyPopper size={18} className="text-pink-500" />;
      case 'Salário': return <Briefcase size={18} className="text-emerald-500" />;
      case 'Investimentos': return <TrendingUp size={18} className="text-cyan-500" />;
      case 'Transferência': return <ArrowRightLeft size={18} className="text-blue-500" />;
      default: return <Package size={18} className="text-slate-500" />;
    }
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-slate-100 font-sans pb-24">
      {/* Top Header */}
      <div className="bg-purple-800 text-white p-5 pt-8 rounded-b-3xl shadow-md">
        <div className="flex justify-between items-center mb-6">
          <div className="p-2.5 bg-purple-700/60 rounded-full">
            <User size={20} className="text-purple-100" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setEsconderValores(!esconderValores)} className="p-2 hover:bg-purple-700/50 rounded-full">
              {esconderValores ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <button onClick={carregarDados} className="p-2 hover:bg-purple-700/50 rounded-full">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <span className="text-sm font-medium opacity-90">Olá, Matheus</span>
        
        {abaAtiva === 'inicio' && (
          <div className="mt-4">
            <span className="text-xs text-purple-200">Saldo Total Disponível</span>
            <div className="text-2xl font-bold mt-0.5">{formatarValor(saldoTotalPatrimonio)}</div>
          </div>
        )}

        {abaAtiva === 'cartoes' && (
          <div className="mt-4">
            <span className="text-xs text-purple-200">Faturas Pendentes no Mês</span>
            <div className="text-2xl font-bold text-rose-300 mt-0.5">{formatarValor(totalGastoCartoes)}</div>
          </div>
        )}

        {abaAtiva === 'relatorios' && (
          <div className="mt-4">
            <span className="text-xs text-purple-200">Total Saídas Efetivadas</span>
            <div className="text-2xl font-bold text-rose-300 mt-0.5">{formatarValor(totalGastosEfetivadosRelatorio)}</div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex justify-between mt-6 pt-2 overflow-x-auto gap-4 scrollbar-none">
          <button onClick={() => { setTipo('saida'); setMostrarFormTransacao(true); }} className="flex flex-col items-center gap-2 min-w-[64px]">
            <div className="w-14 h-14 bg-purple-700/60 hover:bg-purple-700 rounded-full flex items-center justify-center">
              <Minus size={22} className="text-white" />
            </div>
            <span className="text-xs font-semibold">Nova Saída</span>
          </button>

          <button onClick={() => { setTipo('entrada'); setMostrarFormTransacao(true); }} className="flex flex-col items-center gap-2 min-w-[64px]">
            <div className="w-14 h-14 bg-purple-700/60 hover:bg-purple-700 rounded-full flex items-center justify-center">
              <Plus size={22} className="text-white" />
            </div>
            <span className="text-xs font-semibold">Nova Entrada</span>
          </button>

          <button onClick={() => setMostrarFormTransferencia(true)} className="flex flex-col items-center gap-2 min-w-[64px]">
            <div className="w-14 h-14 bg-purple-700/60 hover:bg-purple-700 rounded-full flex items-center justify-center">
              <ArrowRightLeft size={22} className="text-white" />
            </div>
            <span className="text-xs font-semibold">Transferir</span>
          </button>

          <button onClick={() => setMostrarFormConta(true)} className="flex flex-col items-center gap-2 min-w-[64px]">
            <div className="w-14 h-14 bg-purple-700/60 hover:bg-purple-700 rounded-full flex items-center justify-center">
              <PlusCircle size={22} className="text-white" />
            </div>
            <span className="text-xs font-semibold">+ Conta/Cartão</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-2">
        {/* ABA 1: VISÃO GERAL */}
        {abaAtiva === 'inicio' && (
          <>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60">
              <span className="text-xs font-bold text-slate-400 tracking-wider">MINHAS CONTAS</span>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {contasBancarias.map((c) => (
                  <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-slate-500 font-medium">{c.nome}</span>
                      <Landmark size={14} className="text-purple-600" />
                    </div>
                    <div className="font-bold text-sm text-slate-800 mt-1">
                      {formatarValor(calcularSaldoConta(c))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60">
              <span className="text-xs font-bold text-slate-400 tracking-wider">RESUMO MENSAL</span>
              <div className="grid grid-cols-3 gap-2 text-center mt-3">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-emerald-600 font-semibold">Entradas</span>
                  <div className="text-slate-800 font-bold text-xs mt-0.5">{formatarValor(totalEntradas)}</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-rose-600 font-semibold">Saídas</span>
                  <div className="text-slate-800 font-bold text-xs mt-0.5">{formatarValor(totalSaidas)}</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-purple-600 font-semibold">Balanço</span>
                  <div className={`font-bold text-xs mt-0.5 ${balancoMes >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatarValor(balancoMes)}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ABA 2: DETALHAMENTO DOS CARTÕES */}
        {abaAtiva === 'cartoes' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-900 to-slate-900 p-5 rounded-2xl text-white shadow-md">
              <span className="text-xs text-purple-300 font-medium uppercase tracking-wider">Aglomerado de Cartões</span>
              
              <div className="grid grid-cols-2 gap-4 mt-3 pt-2 border-t border-purple-800/60">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Limite Usado</span>
                  <div className="text-lg font-bold text-rose-400">
                    {formatarValor(
                      cartoesCredito.reduce((acc, c) => acc + calcularTotalComprometidoCartao(c), 0)
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Limite Global Disp.</span>
                  <div className="text-lg font-bold text-emerald-400">
                    {formatarValor(
                      totalLimites - cartoesCredito.reduce((acc, c) => acc + calcularTotalComprometidoCartao(c), 0)
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60">
              <span className="text-xs font-bold text-slate-400 tracking-wider">FATURAS E LIMITES INDIVIDUAIS</span>
              <div className="space-y-4 mt-4">
                {cartoesCredito.map((card) => {
                  const faturaAtual = calcularFaturaAtual(card);
                  const comprometidoTotal = calcularTotalComprometidoCartao(card);
                  const limiteTotalCard = Number(card.limite_total) || 0;
                  const disponivelReal = limiteTotalCard - comprometidoTotal;
                  const melhorDia = card.dia_fechamento + 1;
                  const porcUso = limiteTotalCard > 0 ? Math.min((comprometidoTotal / limiteTotalCard) * 100, 100) : 0;

                  return (
                    <div key={card.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <CreditCard size={18} className="text-purple-700" />
                          <span className="font-bold text-sm text-slate-800">{card.nome}</span>
                        </div>
                        <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-bold">
                          Vencimento: Dia {card.dia_vencimento}
                        </span>
                      </div>

                      <div className="text-[11px] text-purple-900 bg-purple-50 p-2 rounded-lg font-medium flex items-center gap-1.5">
                        <Calendar size={13} className="text-purple-700" />
                        Melhor dia de compra: <strong className="text-purple-800">Dia {melhorDia}</strong> (Fecha dia {card.dia_fechamento})
                      </div>

                      {limiteTotalCard > 0 && (
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                            <span>Comprometido (Atual + Futuro)</span>
                            <span>{porcUso.toFixed(0)}% do Limite</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${porcUso > 80 ? 'bg-rose-500' : 'bg-purple-600'}`} 
                              style={{ width: `${porcUso}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Fatura Atual</span>
                          <div className="font-bold text-sm text-rose-600">{formatarValor(faturaAtual)}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Disp. Real</span>
                          <div className="font-bold text-sm text-emerald-600">{formatarValor(disponivelReal)}</div>
                        </div>
                      </div>

                      {faturaAtual > 0 && (
                        <button
                          onClick={() => setCartaoParaPagar(card)}
                          className="w-full py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg shadow-sm hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 mt-2"
                        >
                          <DollarSign size={14} />
                          Pagar Fatura de {formatarValor(faturaAtual)}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: RELATÓRIOS */}
        {abaAtiva === 'relatorios' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60">
              <span className="text-xs font-bold text-slate-400 tracking-wider">GASTOS POR CATEGORIA</span>
              
              <div className="space-y-4 mt-4">
                {relatorioCat.filter(c => c.categoria !== 'Transferência').length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhum gasto registrado ainda.</p>
                ) : (
                  relatorioCat.filter(c => c.categoria !== 'Transferência').map((item, idx) => {
                    const totalGasto = Number(item.total);
                    const porcentagem = totalGastosEfetivadosRelatorio > 0 
                      ? ((totalGasto / totalGastosEfetivadosRelatorio) * 100).toFixed(1) 
                      : '0';

                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2 font-bold text-slate-700">
                            {getIcone(item.categoria)}
                            <span>{item.categoria}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-800">{formatarValor(totalGasto)}</span>
                            <span className="text-[10px] text-slate-400 ml-1">({porcentagem}%)</span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-purple-600 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${porcentagem}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: PAGAR FATURA */}
        {cartaoParaPagar && (
          <div className="bg-white p-5 rounded-2xl shadow-xl border-2 border-emerald-600 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-600" /> Pagar Fatura - {cartaoParaPagar.nome}
              </h2>
              <button onClick={() => setCartaoParaPagar(null)} className="text-xs text-slate-400 font-bold">
                Fechar
              </button>
            </div>

            <form onSubmit={handlePagarFatura} className="space-y-3">
              <div>
                <span className="text-xs text-slate-500">Valor da Fatura a Pagar</span>
                <div className="text-xl font-bold text-rose-600 mt-0.5">
                  {formatarValor(calcularFaturaAtual(cartaoParaPagar))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Debitar de qual conta?</label>
                <select
                  value={contaPagamentoFatura}
                  onChange={e => setContaPagamentoFatura(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs outline-none font-bold"
                >
                  {contasBancarias.map(c => (
                    <option key={c.id} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <input
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs outline-none"
              />

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-emerald-700 transition"
              >
                Confirmar Pagamento da Fatura
              </button>
            </form>
          </div>
        )}

        {/* MODAL: TRANSFERÊNCIA */}
        {mostrarFormTransferencia && (
          <div className="bg-white p-5 rounded-2xl shadow-xl border-2 border-purple-600 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-purple-700" /> Transferência entre Contas
              </h2>
              <button onClick={() => setMostrarFormTransferencia(false)} className="text-xs text-slate-400 font-bold">
                Fechar
              </button>
            </div>

            <form onSubmit={handleTransferencia} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400">VALOR (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="R$ 0,00"
                  value={valorTransferencia}
                  onChange={e => setValorTransferencia(e.target.value)}
                  className="w-full text-xl font-bold p-2 border-b-2 border-purple-500 outline-none text-purple-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">DE (SAI DE):</label>
                  <select
                    value={contaOrigem}
                    onChange={e => setContaOrigem(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs outline-none"
                  >
                    {contasBancarias.map(c => (
                      <option key={c.id} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500">PARA (VAI PARA):</label>
                  <select
                    value={contaDestino}
                    onChange={e => setContaDestino(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs outline-none"
                  >
                    {contasBancarias.map(c => (
                      <option key={c.id} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <input
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs outline-none"
              />

              <button
                type="submit"
                className="w-full py-3 bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md hover:bg-purple-800 transition"
              >
                Confirmar Transferência
              </button>
            </form>
          </div>
        )}

        {/* Modal Transação Comum */}
        {mostrarFormTransacao && (
          <div className="bg-white p-5 rounded-2xl shadow-xl border-2 border-purple-600 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-sm font-bold text-slate-800">
                {tipo === 'saida' ? '🔴 Nova Despesa' : '🟢 Nova Receita'}
              </h2>
              <button onClick={() => setMostrarFormTransacao(false)} className="text-xs text-slate-400 font-bold">
                Fechar
              </button>
            </div>

            <form onSubmit={handleSalvarTransacao} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400">VALOR (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="R$ 0,00"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  className="w-full text-xl font-bold p-2 border-b-2 border-purple-500 outline-none text-purple-900"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border">
                <span className="text-xs font-bold text-slate-700">
                  {pago ? '✅ Efetivado / Pago' : '⏳ Não foi paga (Pendente)'}
                </span>
                <input 
                  type="checkbox" 
                  checked={pago} 
                  onChange={e => setPago(e.target.checked)} 
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
              </div>

              <input
                type="text"
                placeholder="Descrição (ex: Mercado, Fatura Porto)"
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs outline-none"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value)}
                  className="p-2.5 bg-slate-50 border rounded-xl text-xs outline-none"
                >
                  <option value="Alimentação">🍔 Alimentação</option>
                  <option value="Moradia">🏠 Moradia</option>
                  <option value="Transporte">🚗 Transporte</option>
                  <option value="Lazer">🎉 Lazer</option>
                  <option value="Salário">💼 Salário</option>
                  <option value="Cartões">💳 Cartões</option>
                  <option value="Outros">📦 Outros</option>
                </select>

                <select
                  value={bancoSelecionado}
                  onChange={e => setBancoSelecionado(e.target.value)}
                  className="p-2.5 bg-slate-50 border rounded-xl text-xs outline-none"
                >
                  {contas.map(c => (
                    <option key={c.id} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-semibold">📌 Despesa Fixa?</span>
                  <input 
                    type="checkbox" 
                    checked={isFixo} 
                    onChange={e => setIsFixo(e.target.checked)} 
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-semibold">🔁 Repetir / Parcelar?</span>
                  <input 
                    type="checkbox" 
                    checked={isRepeat} 
                    onChange={e => setIsRepeat(e.target.checked)} 
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                </div>

                {isRepeat && (
                  <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-xl border border-purple-200">
                    <input 
                      type="number" 
                      min="2" 
                      max="48"
                      value={numVezes} 
                      onChange={e => setNumVezes(e.target.value)}
                      className="w-16 p-1 bg-white border rounded text-xs font-bold text-center"
                    />
                    <span className="text-xs text-purple-900 font-semibold">vezes em Meses</span>
                  </div>
                )}
              </div>

              <input
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs outline-none"
              />

              <button
                type="submit"
                className="w-full py-3 bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md hover:bg-purple-800 transition"
              >
                Salvar Transação
              </button>
            </form>
          </div>
        )}

        {/* Modal Cadastrar Conta */}
        {mostrarFormConta && (
          <div className="bg-white p-4 rounded-2xl shadow-md border-2 border-purple-600 space-y-3">
            <h2 className="text-sm font-bold text-slate-800">🏛️ Cadastrar Conta / Cartão</h2>

            <form onSubmit={handleCriarConta} className="space-y-3">
              <input
                type="text"
                placeholder="Nome (ex: Atacadão, Itaú, Porto)"
                value={nomeConta}
                onChange={e => setNomeConta(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs outline-none"
              />

              <select
                value={tipoConta}
                onChange={e => setTipoConta(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs outline-none"
              >
                <option value="Conta Corrente">Conta Corrente</option>
                <option value="Cartao de Credito">💳 Cartão de Crédito</option>
                <option value="Benefício">Vale Refeição / VR</option>
                <option value="Transporte">Bilhete Único / VT</option>
              </select>

              {tipoConta === 'Cartao de Credito' ? (
                <>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Limite Total (R$)"
                    value={limiteTotal}
                    onChange={e => setLimiteTotal(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Dia Fechamento (ex: 15)"
                      value={diaFechamento}
                      onChange={e => setDiaFechamento(e.target.value)}
                      className="p-2.5 bg-slate-50 border rounded-xl text-xs outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Dia Vencimento (ex: 25)"
                      value={diaVencimento}
                      onChange={e => setDiaVencimento(e.target.value)}
                      className="p-2.5 bg-slate-50 border rounded-xl text-xs outline-none"
                    />
                  </div>
                </>
              ) : (
                <input
                  type="number"
                  step="0.01"
                  placeholder="Saldo Inicial (R$)"
                  value={saldoInicial}
                  onChange={e => setSaldoInicial(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs outline-none"
                />
              )}

              <button
                type="submit"
                className="w-full py-3 bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md hover:bg-purple-800 transition"
              >
                Salvar
              </button>
            </form>
          </div>
        )}

        {/* Histórico Transações */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60">
          <h2 className="text-xs font-bold text-slate-400 tracking-wider mb-3">HISTÓRICO DE TRANSAÇÕES</h2>
          <div className="space-y-3">
            {transacoes.slice(0, 10).map((t) => (
              <div 
                key={t.id} 
                className="flex items-center justify-between border-b border-slate-100 pb-2.5 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleStatusPago(t.id, t.pago)}>
                    {t.pago ? (
                      <CheckCircle size={20} className="text-emerald-500" />
                    ) : (
                      <Clock size={20} className="text-amber-500" />
                    )}
                  </button>
                  <div>
                    <div className="font-bold text-xs text-slate-800">{t.descricao}</div>
                    <div className="text-[10px] text-slate-400">{t.banco} • {t.categoria}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-xs ${t.tipo === 'entrada' ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {t.tipo === 'entrada' ? '+' : '-'} {formatarValor(Number(t.valor))}
                  </div>
                  <div className="text-[10px] text-slate-400">{t.data}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MENU NAVEGAÇÃO FIXO NO RODAPÉ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 flex justify-around max-w-md mx-auto z-50">
        <button 
          onClick={() => setAbaAtiva('inicio')}
          className={`flex flex-col items-center gap-1 p-1 text-xs font-bold transition ${
            abaAtiva === 'inicio' ? 'text-purple-700' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard size={20} />
          <span>Início</span>
        </button>

        <button 
          onClick={() => setAbaAtiva('cartoes')}
          className={`flex flex-col items-center gap-1 p-1 text-xs font-bold transition ${
            abaAtiva === 'cartoes' ? 'text-purple-700' : 'text-slate-400'
          }`}
        >
          <CreditCard size={20} />
          <span>Cartões</span>
        </button>

        <button 
          onClick={() => setAbaAtiva('relatorios')}
          className={`flex flex-col items-center gap-1 p-1 text-xs font-bold transition ${
            abaAtiva === 'relatorios' ? 'text-purple-700' : 'text-slate-400'
          }`}
        >
          <BarChart3 size={20} />
          <span>Relatórios</span>
        </button>
      </div>
    </main>
  );
}