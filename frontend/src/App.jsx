import { useEffect, useState } from 'react'
import './App.css'

const API_URL = 'http://localhost:3000'

const initialForm = {
  full_name: '',
  email: '',
  password: '',
  role: '',
  phone_number: '',
}

function App() {
  const [form, setForm] = useState(initialForm)
  const [users, setUsers] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function fetchUsers() {
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/users`)
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  function handleChange(e) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function resetForm() {
    setForm(initialForm)
    setEditingId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const method = editingId ? 'PUT' : 'POST'
    const url = editingId
      ? `${API_URL}/users/${editingId}`
      : `${API_URL}/users`

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      setMessage(editingId ? 'User updated successfully' : 'User created successfully')
      resetForm()
      fetchUsers()
    } catch (error) {
      setMessage(error.message)
    }
  }

  function handleEdit(user) {
    setEditingId(user.user_id)

    setForm({
      full_name: user.full_name || '',
      email: user.email || '',
      password: user.password || '',
      role: user.role || '',
      phone_number: user.phone_number || '',
    })
  }

  async function handleDelete(id) {
    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete user')
      }

      setMessage('User deleted successfully')
      fetchUsers()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <div className="container">
      <div className="left-panel">
        <h1>User Management</h1>

        <form onSubmit={handleSubmit} className="user-form">
          <input
            type="text"
            name="full_name"
            placeholder="Full Name"
            value={form.full_name}
            onChange={handleChange}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            required
          >
            <option value="">Select Role</option>
            <option value="admin">Admin</option>
            <option value="doctor">Doctor</option>
            <option value="patient">Patient</option>
          </select>

          <input
            type="text"
            name="phone_number"
            placeholder="Phone Number"
            value={form.phone_number}
            onChange={handleChange}
          />

          <div className="button-group">
            <button type="submit">
              {editingId ? 'Update User' : 'Create User'}
            </button>

            {editingId && (
              <button type="button" onClick={resetForm} className="cancel-btn">
                Cancel
              </button>
            )}
          </div>
        </form>

        {message && <p className="message">{message}</p>}
      </div>

      <div className="right-panel">
        <div className="header-row">
          <h2>All Users</h2>
          <span className="count">{users.length}</span>
        </div>

        {isLoading ? (
          <p>Loading users...</p>
        ) : (
          <div className="user-list">
            {users.map((user) => (
              <div className="user-card" key={user.user_id}>
                <h3>{user.full_name}</h3>
                <p>{user.email}</p>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>Phone:</strong> {user.phone_number}</p>

                <div className="card-buttons">
                  <button onClick={() => handleEdit(user)}>Edit</button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(user.user_id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App