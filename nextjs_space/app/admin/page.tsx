'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  status: string;
  category: string | null;
  createdAt: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('approved');
  const [newCategory, setNewCategory] = useState('Pos-graduando');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      if (userRes.ok) {
        const userData = await userRes.json();
        setCurrentUser(userData);

        if (userData.category !== 'Admin') {
          router.replace('/dashboard');
          return;
        }
      }

      const usersRes = await fetch('/api/admin/users');
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          status: newStatus,
          category: newCategory,
        }),
      });

      if (res.ok) {
        fetchData();
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!currentUser?.id) {
      return;
    }

    if (user.id === currentUser.id) {
      alert('You cannot delete your own user account.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete user ${user.name || user.email || user.id}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingUserId(user.id);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });

      const payload = await res.json();

      if (!res.ok) {
        alert(payload?.error || 'Could not delete user.');
        return;
      }

      setUsers((prevUsers) => prevUsers.filter((item) => item.id !== user.id));
      alert('User deleted successfully.');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Unexpected error deleting user.');
    } finally {
      setDeletingUserId(null);
    }
  };

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  if (!currentUser || currentUser.category !== 'Admin') {
    return <div style={{ padding: '2rem' }}>Access denied</div>;
  }

  return (
    <div>
      <header className="header">
        <div className="header-container">
          <div className="logo-section">
            <div style={{ position: 'relative', width: '40px', height: '40px' }}>
              <Image src="/logo.png" alt="LERP Logo" fill style={{ objectFit: 'contain' }} />
            </div>
            <div className="logo-text"><h1>LERP</h1></div>
          </div>
          <nav className="nav-tabs">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/admin">Admin</Link>
          </nav>
          <div className="user-menu">
            <span>{currentUser?.name}</span>
            <button onClick={() => router.push('/api/auth/signout')}>Sign Out</button>
          </div>
        </div>
      </header>

      <main className="container">
        <h2 className="page-title">Admin Panel</h2>

        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            href="/admin/settings"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '10px 20px', background: '#3498db', color: 'white',
              borderRadius: '6px', textDecoration: 'none', fontWeight: 500,
            }}
          >
            ⚙️ Categories &amp; Storage Settings
          </Link>
        </div>

        <h3 style={{ marginBottom: '1rem', marginTop: '2rem' }}>Manage Users</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Category</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name || '-'}</td>
                <td>{user.email}</td>
                <td>{user.category || '-'}</td>
                <td><span className={`status-badge status-${user.status}`}>{user.status}</span></td>
                <td>{new Date(user.createdAt).toLocaleDateString('en-US')}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      onClick={() => setSelectedUser(user.id)}
                      style={{ padding: '0.5rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      disabled={deletingUserId === user.id || currentUser?.id === user.id}
                      style={{
                        padding: '0.5rem',
                        background: currentUser?.id === user.id ? '#b3b3b3' : '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: currentUser?.id === user.id ? 'not-allowed' : 'pointer',
                        opacity: deletingUserId === user.id ? 0.7 : 1,
                      }}
                      title={currentUser?.id === user.id ? 'You cannot delete your own user account' : 'Delete user'}
                    >
                      {deletingUserId === user.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {selectedUser && (
          <div className="modal" onClick={() => setSelectedUser(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Update User</h3>
              <div className="form-group">
                <label>Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                </select>
              </div>

              <div className="form-group">
                <label>Category</label>
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                  <option value="IC">IC</option>
                  <option value="Pos-graduando">Pos-graduando</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => handleUpdateUser(selectedUser)}
                  className="button button-primary"
                >
                  Save
                </button>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="button"
                  style={{ background: '#999', color: 'white', border: 'none' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
