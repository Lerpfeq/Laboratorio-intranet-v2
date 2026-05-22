'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface UserInfo {
  id: string;
  name: string | null;
  email: string | null;
  category: string | null;
  status: string;
}

interface Equipamento {
  id: string;
  nome: string;
  descricao: string | null;
  sopLink: string | null;
  autorizacoes: any[];
}

interface AgendamentoEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: any;
}

// Color palette for equipment
const COLORS = [
  '#3498db', '#e67e22', '#2ecc71', '#9b59b6', '#e74c3c',
  '#1abc9c', '#f39c12', '#2c3e50', '#d35400', '#8e44ad',
];

export default function AgendamentosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
  const [selectedEquipamento, setSelectedEquipamento] = useState<string>('all');
  const [calendarView, setCalendarView] = useState<any>(Views.WEEK);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    equipamentoId: '',
    paraQuem: 'eu' as 'eu' | 'interno' | 'externo',
    paraUsuarioInternoId: '',
    paraUsuarioExterno: '',
    emailExterno: '',
    emailOrientador: '',
    inicio: '',
    fim: '',
    observacoes: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) setUser(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const fetchEquipamentos = useCallback(async () => {
    try {
      const res = await fetch('/api/equipamentos');
      if (res.ok) setEquipamentos(await res.json());
    } catch (err) { console.error(err); }
  }, []);

  const fetchAgendamentos = useCallback(async () => {
    try {
      const url = selectedEquipamento === 'all'
        ? '/api/agendamentos'
        : `/api/agendamentos?equipamentoId=${selectedEquipamento}`;
      const res = await fetch(url);
      if (res.ok) setAgendamentos(await res.json());
    } catch (err) { console.error(err); }
  }, [selectedEquipamento]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data.filter((u: UserInfo) => u.status === 'approved'));
      }
    } catch (err) { /* non-admin won't have access */ }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUser();
      fetchEquipamentos();
      fetchAgendamentos();
      fetchUsers();
    }
  }, [session, fetchUser, fetchEquipamentos, fetchAgendamentos, fetchUsers]);

  useEffect(() => {
    fetchAgendamentos();
  }, [selectedEquipamento, fetchAgendamentos]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Map equipment IDs to colors
  const equipColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    equipamentos.forEach((eq, i) => {
      map[eq.id] = COLORS[i % COLORS.length];
    });
    return map;
  }, [equipamentos]);

  // Convert agendamentos to calendar events
  const events: AgendamentoEvent[] = useMemo(() => {
    return agendamentos.map((ag) => {
      let paraQuem = ag.usuario?.name || 'Desconhecido';
      if (ag.paraUsuarioInterno) {
        paraQuem = ag.paraUsuarioInterno.name || ag.paraUsuarioInterno.email;
      } else if (ag.paraUsuarioExterno) {
        paraQuem = `${ag.paraUsuarioExterno} (Externo)`;
      }

      return {
        id: ag.id,
        title: `${ag.equipamento?.nome || 'Equip.'} - ${paraQuem}`,
        start: new Date(ag.inicio),
        end: new Date(ag.fim),
        resource: ag,
      };
    });
  }, [agendamentos]);

  const eventStyleGetter = (event: AgendamentoEvent) => {
    const color = equipColorMap[event.resource?.equipamentoId] || '#3498db';
    return {
      style: {
        backgroundColor: color,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        fontSize: '0.8rem',
      },
    };
  };

  const handleSelectSlot = (slotInfo: any) => {
    const start = slotInfo.start as Date;
    const end = slotInfo.end as Date;
    // Format for datetime-local
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmtDate = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setFormData({
      equipamentoId: selectedEquipamento === 'all' ? (equipamentos[0]?.id || '') : selectedEquipamento,
      paraQuem: 'eu',
      paraUsuarioInternoId: '',
      paraUsuarioExterno: '',
      emailExterno: '',
      emailOrientador: '',
      inicio: fmtDate(start),
      fim: fmtDate(end),
      observacoes: '',
    });
    setShowModal(true);
  };

  const handleSelectEvent = (event: AgendamentoEvent) => {
    setShowDetailModal(event.resource);
  };

  const handleSubmit = async () => {
    // Validations
    if (!formData.equipamentoId) return showMsg('error', 'Selecione um equipamento');
    if (!formData.inicio || !formData.fim) return showMsg('error', 'Datas são obrigatórias');

    const inicioDate = new Date(formData.inicio);
    const fimDate = new Date(formData.fim);
    if (fimDate <= inicioDate) return showMsg('error', 'Fim deve ser posterior ao início');

    if (formData.paraQuem === 'externo') {
      if (!formData.paraUsuarioExterno.trim()) return showMsg('error', 'Nome do externo é obrigatório');
      if (!formData.emailExterno.trim()) return showMsg('error', 'Email do externo é obrigatório');
      if (!formData.emailOrientador.trim()) return showMsg('error', 'Email do orientador é obrigatório para externos');
    }
    if (formData.paraQuem === 'interno' && !formData.paraUsuarioInternoId) {
      return showMsg('error', 'Selecione o usuário interno');
    }

    setSaving(true);
    try {
      const res = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg('success', 'Agendamento criado com sucesso!');
        setShowModal(false);
        fetchAgendamentos();
      } else {
        showMsg('error', data.error || 'Erro ao criar agendamento');
      }
    } catch { showMsg('error', 'Erro de conexão'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este agendamento?')) return;
    try {
      const res = await fetch(`/api/agendamentos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showMsg('success', 'Agendamento excluído!');
        setShowDetailModal(null);
        fetchAgendamentos();
      } else {
        const data = await res.json();
        showMsg('error', data.error || 'Erro ao excluir');
      }
    } catch { showMsg('error', 'Erro de conexão'); }
  };

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando...</div>;
  }

  const isAdmin = user?.category === 'Admin';
  const formatDateTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  };

  const messages = {
    today: 'Hoje',
    previous: '←',
    next: '→',
    month: 'Mês',
    week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda',
    date: 'Data',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'Sem agendamentos neste período.',
    showMore: (total: number) => `+${total} mais`,
  };

  return (
    <div>
      <header className="header">
        <div className="header-container">
          <div className="logo-section">
            <div style={{ position: 'relative', width: '40px', height: '40px' }}>
              <Image src="/logo.png" alt="LERP" fill style={{ objectFit: 'contain' }} />
            </div>
            <div className="logo-text"><h1>LERP</h1></div>
          </div>
          <nav className="nav-tabs">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/reagentes">Reagentes</Link>
            <Link href="/agendamentos" style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '4px' }}>Calendário</Link>
            <Link href="/residuos">Resíduos</Link>
            {isAdmin && <Link href="/agendamentos/settings">Settings</Link>}
            {isAdmin && <Link href="/admin">Admin</Link>}
          </nav>
          <div className="user-menu">
            <span>{user?.name || user?.email}</span>
            <button onClick={() => router.push('/api/auth/signout')}>Sair</button>
          </div>
        </div>
      </header>

      <main className="container" style={{ maxWidth: '1400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="page-title" style={{ marginBottom: 0 }}>📅 Agendamento de Equipamentos</h2>
          <button className="button button-primary" onClick={() => {
            const now = new Date();
            const pad = (n: number) => String(n).padStart(2, '0');
            const fmtDate = (d: Date) =>
              `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            const oneHour = new Date(now.getTime() + 3600000);
            setFormData({
              equipamentoId: equipamentos[0]?.id || '',
              paraQuem: 'eu',
              paraUsuarioInternoId: '',
              paraUsuarioExterno: '',
              emailExterno: '',
              emailOrientador: '',
              inicio: fmtDate(now),
              fim: fmtDate(oneHour),
              observacoes: '',
            });
            setShowModal(true);
          }}>
            + Novo Agendamento
          </button>
        </div>

        {message && (
          <div className={`alert alert-${message.type}`} style={{ marginBottom: '1rem' }}>
            {message.text}
          </div>
        )}

        {/* Info banner about cleanup */}
        <div style={{
          background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px',
          padding: '10px 16px', marginBottom: '1rem', fontSize: '0.85rem', color: '#856404',
        }}>
          ⚠️ Agendamentos passados são removidos automaticamente todos os dias à 00:05.
        </div>

        {/* Filter by equipment */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 500 }}>Filtrar equipamento:</label>
          <select
            value={selectedEquipamento}
            onChange={(e) => setSelectedEquipamento(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '200px' }}
          >
            <option value="all">Todos os equipamentos</option>
            {equipamentos.map((eq) => (
              <option key={eq.id} value={eq.id}>{eq.nome}</option>
            ))}
          </select>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            {equipamentos.map((eq, i) => (
              <div key={eq.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: COLORS[i % COLORS.length] }} />
                {eq.nome}
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 650 }}
            view={calendarView}
            onView={(v) => setCalendarView(v)}
            date={calendarDate}
            onNavigate={(d) => setCalendarDate(d)}
            selectable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            messages={messages}
            culture="pt-BR"
            step={30}
            timeslots={2}
            min={new Date(2020, 0, 1, 7, 0)}
            max={new Date(2020, 0, 1, 22, 0)}
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            popup
          />
        </div>

        {/* New Booking Modal */}
        {showModal && (
          <div className="modal" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>📅 Novo Agendamento</h3>

              <div className="form-group">
                <label>Equipamento *</label>
                <select value={formData.equipamentoId} onChange={(e) => setFormData({ ...formData, equipamentoId: e.target.value })}>
                  <option value="">Selecione...</option>
                  {equipamentos.map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.nome}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Para quem? *</label>
                <select value={formData.paraQuem} onChange={(e) => setFormData({ ...formData, paraQuem: e.target.value as any })}>
                  <option value="eu">Eu mesmo</option>
                  <option value="interno">Usuário interno</option>
                  <option value="externo">Usuário externo</option>
                </select>
              </div>

              {formData.paraQuem === 'interno' && (
                <div className="form-group">
                  <label>Selecionar usuário *</label>
                  <select value={formData.paraUsuarioInternoId} onChange={(e) => setFormData({ ...formData, paraUsuarioInternoId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.paraQuem === 'externo' && (
                <>
                  <div className="form-group">
                    <label>Nome do usuário externo *</label>
                    <input value={formData.paraUsuarioExterno} onChange={(e) => setFormData({ ...formData, paraUsuarioExterno: e.target.value })} placeholder="Nome completo" />
                  </div>
                  <div className="form-group">
                    <label>Email do externo *</label>
                    <input type="email" value={formData.emailExterno} onChange={(e) => setFormData({ ...formData, emailExterno: e.target.value })} placeholder="email@exemplo.com" />
                  </div>
                  <div className="form-group">
                    <label>Email do orientador * <span style={{ color: '#e74c3c', fontSize: '0.8rem' }}>(obrigatório para externos)</span></label>
                    <input type="email" value={formData.emailOrientador} onChange={(e) => setFormData({ ...formData, emailOrientador: e.target.value })} placeholder="orientador@exemplo.com" />
                  </div>
                </>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Início *</label>
                  <input type="datetime-local" value={formData.inicio} onChange={(e) => setFormData({ ...formData, inicio: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Fim *</label>
                  <input type="datetime-local" value={formData.fim} onChange={(e) => setFormData({ ...formData, fim: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label>Observações</label>
                <textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} rows={3} placeholder="Informações adicionais..." />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="button button-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button className="button button-primary" onClick={handleSubmit} disabled={saving}>
                  {saving ? 'Salvando...' : 'Agendar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && (
          <div className="modal" onClick={() => setShowDetailModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
              <h3 style={{ marginBottom: '1rem' }}>📋 Detalhes do Agendamento</h3>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#555', width: '40%' }}>Equipamento</td>
                    <td style={{ padding: '10px' }}>
                      {showDetailModal.equipamento?.nome}
                      {showDetailModal.equipamento?.sopLink && (
                        <a href={showDetailModal.equipamento.sopLink} target="_blank" rel="noopener noreferrer"
                          style={{ marginLeft: '8px', color: '#3498db', fontSize: '0.85rem' }}>
                          📄 SOP
                        </a>
                      )}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#555' }}>Agendado por</td>
                    <td style={{ padding: '10px' }}>{showDetailModal.usuario?.name || showDetailModal.usuario?.email || '—'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#555' }}>Para</td>
                    <td style={{ padding: '10px' }}>
                      {showDetailModal.paraUsuarioInterno
                        ? `${showDetailModal.paraUsuarioInterno.name || showDetailModal.paraUsuarioInterno.email} (Interno)`
                        : showDetailModal.paraUsuarioExterno
                        ? `${showDetailModal.paraUsuarioExterno} (Externo - ${showDetailModal.emailExterno})`
                        : `${showDetailModal.usuario?.name || '—'} (Próprio)`}
                    </td>
                  </tr>
                  {showDetailModal.emailOrientador && (
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px', fontWeight: 600, color: '#555' }}>Orientador</td>
                      <td style={{ padding: '10px' }}>{showDetailModal.emailOrientador}</td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#555' }}>Início</td>
                    <td style={{ padding: '10px' }}>{formatDateTime(showDetailModal.inicio)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#555' }}>Fim</td>
                    <td style={{ padding: '10px' }}>{formatDateTime(showDetailModal.fim)}</td>
                  </tr>
                  {showDetailModal.observacoes && (
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px', fontWeight: 600, color: '#555' }}>Observações</td>
                      <td style={{ padding: '10px' }}>{showDetailModal.observacoes}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                {(isAdmin || showDetailModal.userId === user?.id) && (
                  <button className="button button-danger" style={{ padding: '8px 16px' }} onClick={() => handleDelete(showDetailModal.id)}>
                    🗑️ Excluir
                  </button>
                )}
                <button className="button button-secondary" onClick={() => setShowDetailModal(null)}>Fechar</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
