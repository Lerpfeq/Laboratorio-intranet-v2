'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  category: string | null;
  status: string;
}

interface Autorizacao {
  id: string;
  userId: string;
  tipo: 'RESPONSAVEL' | 'TREINADO';
  user: { id: string; name: string | null; email: string | null };
}

interface Equipamento {
  id: string;
  nome: string;
  descricao: string | null;
  sopLink: string | null;
  autorizacoes: Autorizacao[];
  _count?: { agendamentos: number };
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Equipamento | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<Equipamento | null>(null);
  const [formData, setFormData] = useState({ nome: '', descricao: '', sopLink: '' });
  const [authForm, setAuthForm] = useState({ userId: '', tipo: 'TREINADO' as 'RESPONSAVEL' | 'TREINADO' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        if (data.category !== 'Admin') {
          router.replace('/agendamentos');
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchEquipamentos = useCallback(async () => {
    try {
      const res = await fetch('/api/equipamentos');
      if (res.ok) setEquipamentos(await res.json());
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) setAllUsers(await res.json());
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUser();
      fetchEquipamentos();
      fetchUsers();
    }
  }, [session, fetchUser, fetchEquipamentos, fetchUsers]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreateEquipamento = async () => {
    if (!formData.nome.trim()) return showMsg('error', 'Nome é obrigatório');
    setSaving(true);
    try {
      const res = await fetch('/api/equipamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        showMsg('success', 'Equipamento criado!');
        setShowCreateModal(false);
        setFormData({ nome: '', descricao: '', sopLink: '' });
        fetchEquipamentos();
      } else {
        const data = await res.json();
        showMsg('error', data.error || 'Erro ao criar');
      }
    } catch { showMsg('error', 'Erro de conexão'); }
    setSaving(false);
  };

  const handleUpdateEquipamento = async () => {
    if (!showEditModal) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/equipamentos/${showEditModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        showMsg('success', 'Equipamento atualizado!');
        setShowEditModal(null);
        fetchEquipamentos();
      } else {
        const data = await res.json();
        showMsg('error', data.error || 'Erro ao atualizar');
      }
    } catch { showMsg('error', 'Erro de conexão'); }
    setSaving(false);
  };

  const handleDeleteEquipamento = async (id: string, nome: string) => {
    if (!confirm(`Excluir equipamento "${nome}"? Todos os agendamentos serão removidos.`)) return;
    try {
      const res = await fetch(`/api/equipamentos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showMsg('success', 'Equipamento excluído!');
        fetchEquipamentos();
      } else {
        showMsg('error', 'Erro ao excluir');
      }
    } catch { showMsg('error', 'Erro de conexão'); }
  };

  const handleAddAuth = async () => {
    if (!showAuthModal || !authForm.userId) return showMsg('error', 'Selecione um usuário');
    setSaving(true);
    try {
      const res = await fetch(`/api/equipamentos/${showAuthModal.id}/autorizacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      if (res.ok) {
        showMsg('success', 'Autorização adicionada!');
        setAuthForm({ userId: '', tipo: 'TREINADO' });
        fetchEquipamentos();
        // Refresh auth modal data
        const updatedRes = await fetch(`/api/equipamentos/${showAuthModal.id}`);
        if (updatedRes.ok) setShowAuthModal(await updatedRes.json());
      } else {
        const data = await res.json();
        showMsg('error', data.error || 'Erro ao adicionar');
      }
    } catch { showMsg('error', 'Erro de conexão'); }
    setSaving(false);
  };

  const handleRemoveAuth = async (autorizacaoId: string) => {
    if (!showAuthModal) return;
    try {
      const res = await fetch(
        `/api/equipamentos/${showAuthModal.id}/autorizacoes?autorizacaoId=${autorizacaoId}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        showMsg('success', 'Autorização removida!');
        fetchEquipamentos();
        const updatedRes = await fetch(`/api/equipamentos/${showAuthModal.id}`);
        if (updatedRes.ok) setShowAuthModal(await updatedRes.json());
      }
    } catch { showMsg('error', 'Erro de conexão'); }
  };

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando...</div>;
  }

  if (!user || user.category !== 'Admin') return null;

  const approvedUsers = allUsers.filter((u) => u.status === 'approved');

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
            <Link href="/agendamentos">Calendário</Link>
            <Link href="/agendamentos/settings" style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '4px' }}>Settings</Link>
            {user.category === 'Admin' && <Link href="/admin">Admin</Link>}
          </nav>
          <div className="user-menu">
            <span>{user.name || user.email}</span>
            <button onClick={() => router.push('/api/auth/signout')}>Sair</button>
          </div>
        </div>
      </header>

      <main className="container">
        <h2 className="page-title">⚙️ Settings - Equipamentos</h2>

        {message && (
          <div className={`alert alert-${message.type}`} style={{ marginBottom: '1rem' }}>
            {message.text}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <p style={{ color: '#666' }}>
            Gerencie equipamentos e autorizações de uso.
          </p>
          <button
            className="button button-primary"
            onClick={() => {
              setFormData({ nome: '', descricao: '', sopLink: '' });
              setShowCreateModal(true);
            }}
          >
            + Novo Equipamento
          </button>
        </div>

        {/* Equipment Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Descrição</th>
                <th>SOP</th>
                <th>Responsáveis</th>
                <th>Treinados</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {equipamentos.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
                    Nenhum equipamento cadastrado
                  </td>
                </tr>
              ) : (
                equipamentos.map((eq) => {
                  const responsaveis = eq.autorizacoes.filter((a) => a.tipo === 'RESPONSAVEL');
                  const treinados = eq.autorizacoes.filter((a) => a.tipo === 'TREINADO');
                  return (
                    <tr key={eq.id}>
                      <td style={{ fontWeight: 600 }}>{eq.nome}</td>
                      <td style={{ color: '#666', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {eq.descricao || '—'}
                      </td>
                      <td>
                        {eq.sopLink ? (
                          <a href={eq.sopLink} target="_blank" rel="noopener noreferrer"
                            style={{ color: '#3498db', textDecoration: 'underline' }}>
                            Ver SOP
                          </a>
                        ) : '—'}
                      </td>
                      <td>
                        {responsaveis.map((a) => (
                          <span key={a.id} className="status-badge" style={{ background: '#e8f5e9', color: '#2e7d32', marginRight: '4px', display: 'inline-block', marginBottom: '4px' }}>
                            {a.user.name || a.user.email}
                          </span>
                        ))}
                        {responsaveis.length === 0 && <span style={{ color: '#999' }}>—</span>}
                      </td>
                      <td>
                        {treinados.map((a) => (
                          <span key={a.id} className="status-badge" style={{ background: '#e3f2fd', color: '#1565c0', marginRight: '4px', display: 'inline-block', marginBottom: '4px' }}>
                            {a.user.name || a.user.email}
                          </span>
                        ))}
                        {treinados.length === 0 && <span style={{ color: '#999' }}>—</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            className="button"
                            style={{ background: '#3498db', color: 'white', padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => {
                              setShowAuthModal(eq);
                              setAuthForm({ userId: '', tipo: 'TREINADO' });
                            }}
                          >
                            👥 Autorizações
                          </button>
                          <button
                            className="button"
                            style={{ background: '#f39c12', color: 'white', padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => {
                              setFormData({ nome: eq.nome, descricao: eq.descricao || '', sopLink: eq.sopLink || '' });
                              setShowEditModal(eq);
                            }}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            className="button button-danger"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => handleDeleteEquipamento(eq.id, eq.nome)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="modal" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Novo Equipamento</h3>
              <div className="form-group">
                <label>Nome *</label>
                <input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: FTIR, DSC, TGA..." />
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} rows={3} placeholder="Descrição do equipamento" />
              </div>
              <div className="form-group">
                <label>Link do SOP</label>
                <input value={formData.sopLink} onChange={(e) => setFormData({ ...formData, sopLink: e.target.value })} placeholder="https://..." />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="button button-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button className="button button-primary" onClick={handleCreateEquipamento} disabled={saving}>
                  {saving ? 'Salvando...' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <div className="modal" onClick={() => setShowEditModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Editar Equipamento</h3>
              <div className="form-group">
                <label>Nome *</label>
                <input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} rows={3} />
              </div>
              <div className="form-group">
                <label>Link do SOP</label>
                <input value={formData.sopLink} onChange={(e) => setFormData({ ...formData, sopLink: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="button button-secondary" onClick={() => setShowEditModal(null)}>Cancelar</button>
                <button className="button button-primary" onClick={handleUpdateEquipamento} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Authorization Modal */}
        {showAuthModal && (
          <div className="modal" onClick={() => setShowAuthModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
              <h3 style={{ marginBottom: '1rem' }}>👥 Autorizações - {showAuthModal.nome}</h3>
              <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <strong>Responsável:</strong> Pode gerenciar o equipamento e suas autorizações.<br />
                <strong>Treinado:</strong> Pode agendar o equipamento.
              </p>

              {/* Add authorization */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Usuário</label>
                  <select
                    value={authForm.userId}
                    onChange={(e) => setAuthForm({ ...authForm, userId: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="">Selecione...</option>
                    {approvedUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Tipo</label>
                  <select
                    value={authForm.tipo}
                    onChange={(e) => setAuthForm({ ...authForm, tipo: e.target.value as any })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="TREINADO">Treinado</option>
                    <option value="RESPONSAVEL">Responsável</option>
                  </select>
                </div>
                <button className="button button-success" onClick={handleAddAuth} disabled={saving} style={{ padding: '8px 16px' }}>
                  {saving ? '...' : '+ Adicionar'}
                </button>
              </div>

              {/* Current authorizations */}
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {showAuthModal.autorizacoes.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#999', padding: '1rem' }}>Nenhuma autorização</p>
                ) : (
                  <table className="table" style={{ fontSize: '0.9rem' }}>
                    <thead>
                      <tr>
                        <th>Usuário</th>
                        <th>Tipo</th>
                        <th>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {showAuthModal.autorizacoes.map((auth) => (
                        <tr key={auth.id}>
                          <td>{auth.user.name || auth.user.email}</td>
                          <td>
                            <span className="status-badge" style={{
                              background: auth.tipo === 'RESPONSAVEL' ? '#e8f5e9' : '#e3f2fd',
                              color: auth.tipo === 'RESPONSAVEL' ? '#2e7d32' : '#1565c0',
                            }}>
                              {auth.tipo === 'RESPONSAVEL' ? '🔑 Responsável' : '✅ Treinado'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="button button-danger"
                              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                              onClick={() => handleRemoveAuth(auth.id)}
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button className="button button-secondary" onClick={() => setShowAuthModal(null)}>Fechar</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
