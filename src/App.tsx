import { FormEvent, useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL = 'http://localhost:8080'

type DashboardCounts = {
  users: number
  appointments: number
  doctors: number
}

type AtAGlance = {
  appointmentsScheduled: number
  departments: number
  specialists: number
  patientScore: number
  avgBookingMinutes: number
}

type Doctor = {
  id: number
  name: string
  email: string
  speciality: string
  department: string
  availability: number
  fee: string
  rating?: string
  avatar?: string
}

type Patient = {
  id: number
  name: string
  email: string
  mobile: string
}

type Appointment = {
  id: number
  patientName: string
  doctorName: string
  date: string
  time: string
  status: string
}

type ScheduleEntry = {
  date: string
  time: string
}

function App() {
  const [publicDoctors, setPublicDoctors] = useState<Doctor[]>([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [formData, setFormData] = useState({
    patientName: '',
    email: '',
    doctorId: '',
    date: '',
    time: '',
  })
  const [message, setMessage] = useState('')
  const [atAGlance, setAtAGlance] = useState<AtAGlance>({
    appointmentsScheduled: 0,
    departments: 0,
    specialists: 0,
    patientScore: 0,
    avgBookingMinutes: 0,
  })
  const [loadingAtAGlance, setLoadingAtAGlance] = useState(true)
  const [view, setView] = useState<'patient' | 'admin' | 'doctor'>('patient')
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [showDoctorLogin, setShowDoctorLogin] = useState(false)
  const [adminAuthData, setAdminAuthData] = useState({ email: '', password: '' })
  const [doctorAuthData, setDoctorAuthData] = useState({ email: '', password: '' })
  const [authMessage, setAuthMessage] = useState('')
  const [adminToken, setAdminToken] = useState('')
  const [doctorToken, setDoctorToken] = useState('')
  const [adminName, setAdminName] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [counts, setCounts] = useState<DashboardCounts>({
    users: 0,
    appointments: 0,
    doctors: 0,
  })
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false)

  const [patients, setPatients] = useState<Patient[]>([])
  const [adminDoctors, setAdminDoctors] = useState<Doctor[]>([])
  const [adminAppointments, setAdminAppointments] = useState<Appointment[]>([])

  const [doctorCreate, setDoctorCreate] = useState({
    name: '',
    email: '',
    password: 'doctor123',
    speciality: '',
    department: '',
    availability: '10',
    fee: '$50',
  })
  const [doctorEdit, setDoctorEdit] = useState({
    id: '',
    department: '',
    availability: '',
    fee: '',
  })

  const [doctorAppointments, setDoctorAppointments] = useState<Appointment[]>([])
  const [doctorPatients, setDoctorPatients] = useState<Patient[]>([])
  const [doctorSchedule, setDoctorSchedule] = useState<ScheduleEntry[]>([])
  const [slotDraft, setSlotDraft] = useState<ScheduleEntry>({ date: '', time: '' })

  const viewFromPath = (pathName: string): 'patient' | 'admin' | 'doctor' => {
    if (pathName.startsWith('/admin')) {
      return 'admin'
    }
    if (pathName.startsWith('/doctor')) {
      return 'doctor'
    }
    return 'patient'
  }

  const pushRoute = (nextView: 'patient' | 'admin' | 'doctor') => {
    const nextPath = nextView === 'admin' ? '/admin' : nextView === 'doctor' ? '/doctor' : '/'
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }
  }

  const request = async (
    path: string,
    method: string,
    body?: unknown,
    token?: string
  ) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload.msg || 'Request failed')
    }
    return payload
  }

  const loadPublicDoctors = async () => {
    setLoadingDoctors(true)
    try {
      const response = await request('/doctors/all-doctors', 'GET')
      const doctorsList = Array.isArray(response.doctors) ? response.doctors : []
      setPublicDoctors(doctorsList)

      setFormData((previous) => ({
        ...previous,
        doctorId: previous.doctorId || (doctorsList[0] ? String(doctorsList[0].id) : ''),
      }))
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Unable to load doctors right now.')
    } finally {
      setLoadingDoctors(false)
    }
  }

  const loadAtAGlance = async () => {
    setLoadingAtAGlance(true)
    try {
      const response = await request('/stats/at-a-glance', 'GET')
      setAtAGlance({
        appointmentsScheduled: Number(response.appointmentsScheduled || 0),
        departments: Number(response.departments || 0),
        specialists: Number(response.specialists || 0),
        patientScore: Number(response.patientScore || 0),
        avgBookingMinutes: Number(response.avgBookingMinutes || 0),
      })
    } catch (error) {
      setAtAGlance({
        appointmentsScheduled: 0,
        departments: 0,
        specialists: 0,
        patientScore: 0,
        avgBookingMinutes: 0,
      })
    } finally {
      setLoadingAtAGlance(false)
    }
  }

  useEffect(() => {
    loadPublicDoctors()
    loadAtAGlance()

    const syncFromRouteAndSession = async () => {
      const routeView = viewFromPath(window.location.pathname)
      const storedRole = localStorage.getItem('role')
      const storedToken = localStorage.getItem('token') || ''
      const storedName = localStorage.getItem('userName') || ''

      if (routeView === 'admin' && storedRole === 'admin' && storedToken) {
        setView('admin')
        setAdminToken(storedToken)
        setAdminName(storedName || 'Admin')
        await loadAdminDashboard(storedToken)
        return
      }

      if (routeView === 'doctor' && storedRole === 'doctor' && storedToken) {
        setView('doctor')
        setDoctorToken(storedToken)
        setDoctorName(storedName || 'Doctor')
        await loadDoctorWorkspace(storedToken)
        return
      }

      setView('patient')
      if (routeView !== 'patient') {
        pushRoute('patient')
      }
    }

    syncFromRouteAndSession()

    const handlePopState = () => {
      const routeView = viewFromPath(window.location.pathname)
      const storedRole = localStorage.getItem('role')

      if (routeView === 'admin' && storedRole === 'admin') {
        setView('admin')
        return
      }

      if (routeView === 'doctor' && storedRole === 'doctor') {
        setView('doctor')
        return
      }

      setView('patient')
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const loadAdminDashboard = async (authToken: string) => {
    setIsLoadingDashboard(true)
    try {
      const [patientsRes, appointmentsRes, doctorsRes] = await Promise.all([
        request('/user/admin/patients', 'GET', undefined, authToken),
        request('/appointments/all-appointments', 'GET', undefined, authToken),
        request('/doctors/all-doctors', 'GET'),
      ])

      const patientsList = Array.isArray(patientsRes.patients) ? patientsRes.patients : []
      const appointmentsList = Array.isArray(appointmentsRes.appointments)
        ? appointmentsRes.appointments
        : []
      const doctorsList = Array.isArray(doctorsRes.doctors) ? doctorsRes.doctors : []

      setPatients(patientsList)
      setAdminAppointments(appointmentsList)
      setAdminDoctors(doctorsList)

      setCounts({
        users: patientsList.length,
        appointments: appointmentsList.length,
        doctors: doctorsList.length,
      })
    } catch (error: unknown) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to load admin data.')
    } finally {
      setIsLoadingDashboard(false)
    }
  }

  const loadDoctorWorkspace = async (authToken: string) => {
    setIsLoadingDashboard(true)
    try {
      const [patientsRes, scheduleRes] = await Promise.all([
        request('/doctors/my-patients', 'GET', undefined, authToken),
        request('/doctors/my-schedule', 'GET', undefined, authToken),
      ])

      setDoctorAppointments(
        Array.isArray(patientsRes.appointments) ? patientsRes.appointments : []
      )
      setDoctorPatients(Array.isArray(patientsRes.patients) ? patientsRes.patients : [])
      setDoctorSchedule(Array.isArray(scheduleRes.schedule) ? scheduleRes.schedule : [])
    } catch (error: unknown) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to load doctor data.')
    } finally {
      setIsLoadingDashboard(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void (async () => {
      setAuthMessage('')
      setMessage('')

      const selectedDoctor = publicDoctors.find(
        (doctor) => String(doctor.id) === formData.doctorId
      )

      if (!selectedDoctor) {
        setMessage('Please select a doctor from the list.')
        return
      }

      try {
        const result = await request(
          '/appointments/book-appointment',
          'POST',
          {
            patientName: formData.patientName,
            patientEmail: formData.email,
            doctorName: selectedDoctor.name,
            date: formData.date,
            time: formData.time,
            doctorId: selectedDoctor.id,
          }
        )

        setMessage(result.msg || 'Appointment booked successfully.')
        setFormData((previous) => ({
          ...previous,
          date: '',
          time: '',
        }))
      } catch (error: unknown) {
        setMessage(error instanceof Error ? error.message : 'Unable to book appointment.')
      }
    })()
  }

  const handleAdminLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthMessage('')

    try {
      const result = await request('/user/login', 'POST', adminAuthData)

      if (result.isAdmin !== 'admin') {
        setAuthMessage('This account is not an admin account.')
        return
      }

      setAdminToken(result.token)
      setAdminName(result.userName || 'Admin')
      localStorage.setItem('token', result.token)
      localStorage.setItem('role', 'admin')
      localStorage.setItem('userName', result.userName || 'Admin')
      setView('admin')
      pushRoute('admin')
      setShowAdminLogin(false)
      setAdminAuthData({ email: '', password: '' })
      await loadAdminDashboard(result.token)
    } catch (error: unknown) {
      setAuthMessage(
        error instanceof Error
          ? error.message
          : 'Unable to reach backend. Please check if server is running.'
      )
    }
  }

  const handleDoctorLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthMessage('')

    try {
      const result = await request('/user/login', 'POST', doctorAuthData)

      if (result.role !== 'doctor') {
        setAuthMessage('This account is not a doctor account.')
        return
      }

      setDoctorToken(result.token)
      setDoctorName(result.userName || 'Doctor')
      localStorage.setItem('token', result.token)
      localStorage.setItem('role', 'doctor')
      localStorage.setItem('userName', result.userName || 'Doctor')
      setView('doctor')
      pushRoute('doctor')
      setShowDoctorLogin(false)
      setDoctorAuthData({ email: '', password: '' })
      await loadDoctorWorkspace(result.token)
    } catch (error: unknown) {
      setAuthMessage(
        error instanceof Error
          ? error.message
          : 'Unable to reach backend. Please check if server is running.'
      )
    }
  }

  const logoutAdmin = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('userName')
    setView('patient')
    pushRoute('patient')
    setAdminToken('')
    setAdminName('')
    setCounts({ users: 0, appointments: 0, doctors: 0 })
  }

  const logoutDoctor = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('userName')
    setView('patient')
    pushRoute('patient')
    setDoctorToken('')
    setDoctorName('')
    setDoctorAppointments([])
    setDoctorPatients([])
    setDoctorSchedule([])
  }

  const deletePatient = async (id: number) => {
    setAuthMessage('')
    try {
      await request(`/user/admin/patients/${id}`, 'DELETE', undefined, adminToken)
      await loadAdminDashboard(adminToken)
    } catch (error: unknown) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to delete patient')
    }
  }

  const createDoctor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthMessage('')
    try {
      await request(
        '/doctors/add-doctor',
        'POST',
        {
          name: doctorCreate.name,
          email: doctorCreate.email,
          password: doctorCreate.password,
          speciality: doctorCreate.speciality,
          department: doctorCreate.department,
          availability: Number(doctorCreate.availability),
          fee: doctorCreate.fee,
          rating: '4.9',
        },
        adminToken
      )
      setDoctorCreate({
        name: '',
        email: '',
        password: 'doctor123',
        speciality: '',
        department: '',
        availability: '10',
        fee: '$50',
      })
      await loadAdminDashboard(adminToken)
    } catch (error: unknown) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to create doctor')
    }
  }

  const updateDoctor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthMessage('')
    if (!doctorEdit.id) {
      setAuthMessage('Select a doctor to edit.')
      return
    }
    try {
      await request(
        `/doctors/update-doctor/${doctorEdit.id}`,
        'PATCH',
        {
          department: doctorEdit.department || undefined,
          availability: doctorEdit.availability ? Number(doctorEdit.availability) : undefined,
          fee: doctorEdit.fee || undefined,
        },
        adminToken
      )
      setDoctorEdit({ id: '', department: '', availability: '', fee: '' })
      await loadAdminDashboard(adminToken)
    } catch (error: unknown) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to update doctor')
    }
  }

  const deleteDoctor = async (id: number) => {
    setAuthMessage('')
    try {
      await request(`/doctors/delete-doctor/${id}`, 'DELETE', undefined, adminToken)
      await loadAdminDashboard(adminToken)
    } catch (error: unknown) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to delete doctor')
    }
  }

  const addScheduleSlot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!slotDraft.date || !slotDraft.time) {
      return
    }

    const exists = doctorSchedule.some(
      (slot) => slot.date === slotDraft.date && slot.time === slotDraft.time
    )
    if (!exists) {
      setDoctorSchedule((prev) => [...prev, slotDraft])
    }
    setSlotDraft({ date: '', time: '' })
  }

  const saveDoctorSchedule = async () => {
    setAuthMessage('')
    try {
      await request('/doctors/my-schedule', 'PUT', { schedule: doctorSchedule }, doctorToken)
      await loadDoctorWorkspace(doctorToken)
    } catch (error: unknown) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to save schedule')
    }
  }

  const removeSlot = (index: number) => {
    setDoctorSchedule((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
  }

  if (view === 'admin') {
    return (
      <div className="app-shell">
        <header className="hero admin-hero">
          <nav className="top-nav">
            <div className="brand">FindMyDoctor Admin</div>
            <div className="nav-links">
              <button className="nav-button" onClick={() => loadAdminDashboard(adminToken)}>
                Refresh
              </button>
              <button className="nav-button nav-button-alt" onClick={logoutAdmin}>
                Logout
              </button>
            </div>
          </nav>
          <div className="hero-content">
            <div>
              <p className="eyebrow">Admin Console</p>
              <h1>Welcome, {adminName}</h1>
              <p className="sub-copy">
                This dashboard is role-protected. Only users with admin role can
                access system-wide data.
              </p>
            </div>
            <div className="hero-card">
              <p>System Overview</p>
              <h2>{counts.appointments}</h2>
              <span>total appointments</span>
            </div>
          </div>
        </header>

        <main>
          <section className="section">
            <h2>Core Metrics</h2>
            <div className="service-grid">
              <article>
                <h3>Total Users</h3>
                <p>{isLoadingDashboard ? 'Loading...' : counts.users}</p>
              </article>
              <article>
                <h3>Total Doctors</h3>
                <p>{isLoadingDashboard ? 'Loading...' : counts.doctors}</p>
              </article>
              <article>
                <h3>Total Appointments</h3>
                <p>{isLoadingDashboard ? 'Loading...' : counts.appointments}</p>
              </article>
            </div>
          </section>

          <section className="section dashboard-grid">
            <article className="panel">
              <h3>Create Doctor</h3>
              <form className="booking-form" onSubmit={createDoctor}>
                <input
                  placeholder="Doctor name"
                  value={doctorCreate.name}
                  onChange={(event) =>
                    setDoctorCreate((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
                <input
                  type="email"
                  placeholder="Doctor email"
                  value={doctorCreate.email}
                  onChange={(event) =>
                    setDoctorCreate((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
                <input
                  type="password"
                  placeholder="Doctor password"
                  value={doctorCreate.password}
                  onChange={(event) =>
                    setDoctorCreate((prev) => ({ ...prev, password: event.target.value }))
                  }
                />
                <input
                  placeholder="Speciality"
                  value={doctorCreate.speciality}
                  onChange={(event) =>
                    setDoctorCreate((prev) => ({ ...prev, speciality: event.target.value }))
                  }
                  required
                />
                <input
                  placeholder="Department"
                  value={doctorCreate.department}
                  onChange={(event) =>
                    setDoctorCreate((prev) => ({ ...prev, department: event.target.value }))
                  }
                  required
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Availability"
                  value={doctorCreate.availability}
                  onChange={(event) =>
                    setDoctorCreate((prev) => ({ ...prev, availability: event.target.value }))
                  }
                  required
                />
                <input
                  placeholder="Fee"
                  value={doctorCreate.fee}
                  onChange={(event) =>
                    setDoctorCreate((prev) => ({ ...prev, fee: event.target.value }))
                  }
                  required
                />
                <button type="submit">Create Doctor</button>
              </form>
            </article>

            <article className="panel">
              <h3>Edit Doctor</h3>
              <form className="booking-form" onSubmit={updateDoctor}>
                <select
                  value={doctorEdit.id}
                  onChange={(event) => {
                    const selected = adminDoctors.find(
                      (doctor) => String(doctor.id) === event.target.value
                    )
                    if (selected) {
                      setDoctorEdit({
                        id: String(selected.id),
                        department: selected.department,
                        availability: String(selected.availability),
                        fee: selected.fee,
                      })
                    } else {
                      setDoctorEdit({ id: '', department: '', availability: '', fee: '' })
                    }
                  }}
                >
                  <option value="">Select doctor</option>
                  {adminDoctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} ({doctor.email})
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Department"
                  value={doctorEdit.department}
                  onChange={(event) =>
                    setDoctorEdit((prev) => ({ ...prev, department: event.target.value }))
                  }
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Availability"
                  value={doctorEdit.availability}
                  onChange={(event) =>
                    setDoctorEdit((prev) => ({ ...prev, availability: event.target.value }))
                  }
                />
                <input
                  placeholder="Fee"
                  value={doctorEdit.fee}
                  onChange={(event) =>
                    setDoctorEdit((prev) => ({ ...prev, fee: event.target.value }))
                  }
                />
                <button type="submit">Update Doctor</button>
              </form>
            </article>
          </section>

          <section className="section dashboard-grid">
            <article className="panel">
              <h3>Patients</h3>
              <div className="list-box">
                {patients.map((patient) => (
                  <div key={patient.id} className="list-row">
                    <div>
                      <strong>{patient.name}</strong>
                      <small>{patient.email}</small>
                    </div>
                    <button className="small-danger" onClick={() => deletePatient(patient.id)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <h3>Doctors</h3>
              <div className="list-box">
                {adminDoctors.map((doctor) => (
                  <div key={doctor.id} className="list-row">
                    <div>
                      <strong>{doctor.name}</strong>
                      <small>
                        {doctor.speciality} | {doctor.department}
                      </small>
                    </div>
                    <button className="small-danger" onClick={() => deleteDoctor(doctor.id)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel panel-wide">
              <h3>Appointments</h3>
              <div className="list-box">
                {adminAppointments.map((item) => (
                  <div key={item.id} className="list-row">
                    <div>
                      <strong>
                        {item.patientName} with {item.doctorName}
                      </strong>
                      <small>
                        {item.date} {item.time} | {item.status}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          {authMessage && <p className="error-message">{authMessage}</p>}
        </main>
      </div>
    )
  }

  if (view === 'doctor') {
    return (
      <div className="app-shell">
        <header className="hero admin-hero">
          <nav className="top-nav">
            <div className="brand">FindMyDoctor Doctor</div>
            <div className="nav-links">
              <button className="nav-button" onClick={() => loadDoctorWorkspace(doctorToken)}>
                Refresh
              </button>
              <button className="nav-button nav-button-alt" onClick={logoutDoctor}>
                Logout
              </button>
            </div>
          </nav>
          <div className="hero-content">
            <div>
              <p className="eyebrow">Doctor Workspace</p>
              <h1>Welcome, Dr. {doctorName}</h1>
              <p className="sub-copy">
                View patients assigned to your appointments and manage your available
                schedule slots.
              </p>
            </div>
            <div className="hero-card">
              <p>Assigned Patients</p>
              <h2>{doctorPatients.length}</h2>
              <span>patients under your care</span>
            </div>
          </div>
        </header>

        <main>
          <section className="section dashboard-grid">
            <article className="panel">
              <h3>My Patients</h3>
              <div className="list-box">
                {doctorPatients.map((patient) => (
                  <div key={patient.id} className="list-row">
                    <div>
                      <strong>{patient.name}</strong>
                      <small>{patient.email}</small>
                    </div>
                  </div>
                ))}
                {!doctorPatients.length && <small>No patients assigned yet.</small>}
              </div>
            </article>

            <article className="panel">
              <h3>Upcoming Appointments</h3>
              <div className="list-box">
                {doctorAppointments.map((item) => (
                  <div key={item.id} className="list-row">
                    <div>
                      <strong>{item.patientName}</strong>
                      <small>
                        {item.date} {item.time} | {item.status}
                      </small>
                    </div>
                  </div>
                ))}
                {!doctorAppointments.length && <small>No appointments found.</small>}
              </div>
            </article>

            <article className="panel panel-wide">
              <h3>Manage Schedule</h3>
              <form className="booking-form schedule-form" onSubmit={addScheduleSlot}>
                <input
                  type="date"
                  value={slotDraft.date}
                  onChange={(event) =>
                    setSlotDraft((prev) => ({ ...prev, date: event.target.value }))
                  }
                  required
                />
                <input
                  type="time"
                  value={slotDraft.time}
                  onChange={(event) =>
                    setSlotDraft((prev) => ({ ...prev, time: event.target.value }))
                  }
                  required
                />
                <button type="submit">Add Slot</button>
              </form>

              <div className="list-box">
                {doctorSchedule.map((slot, index) => (
                  <div key={`${slot.date}-${slot.time}-${index}`} className="list-row">
                    <div>
                      <strong>{slot.date}</strong>
                      <small>{slot.time}</small>
                    </div>
                    <button className="small-danger" onClick={() => removeSlot(index)}>
                      Remove
                    </button>
                  </div>
                ))}
                {!doctorSchedule.length && <small>No schedule slots yet.</small>}
              </div>

              <button className="nav-button" onClick={saveDoctorSchedule}>
                Save Schedule
              </button>
            </article>
          </section>

          {authMessage && <p className="error-message">{authMessage}</p>}
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <nav className="top-nav">
          <div className="brand">FindMyDoctor</div>
          <div className="nav-links">
            <a href="#services">Services</a>
            <a href="#doctors">Doctors</a>
            <a href="#booking">Book</a>
            <button className="nav-button" onClick={() => setShowDoctorLogin(true)}>
              Doctor Login
            </button>
            <button className="nav-button" onClick={() => setShowAdminLogin(true)}>
              Admin Login
            </button>
          </div>
        </nav>

        <div className="hero-content">
          <div>
            <p className="eyebrow">Hospital Booking Platform</p>
            <h1>Trusted care, booked in minutes.</h1>
            <p className="sub-copy">
              A modern appointment experience for patients, doctors, and admins.
              Fast scheduling, transparent availability, and reliable follow-up.
            </p>
            <a className="cta" href="#booking">
              Book an appointment
            </a>
          </div>
          <div className="hero-card">
            <p>Today at a glance</p>
            <h2>{loadingAtAGlance ? '...' : atAGlance.appointmentsScheduled}</h2>
            <span>appointments scheduled</span>
            <div className="metrics-grid">
              <div>
                <strong>{loadingAtAGlance ? '...' : atAGlance.departments}</strong>
                <small>departments</small>
              </div>
              <div>
                <strong>{loadingAtAGlance ? '...' : atAGlance.specialists}</strong>
                <small>specialists</small>
              </div>
              <div>
                <strong>
                  {loadingAtAGlance ? '...' : atAGlance.patientScore.toFixed(1)}
                </strong>
                <small>patient score</small>
              </div>
              <div>
                <strong>
                  {loadingAtAGlance ? '...' : `${Math.round(atAGlance.avgBookingMinutes)}m`}
                </strong>
                <small>avg booking time</small>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section id="services" className="section service-section">
          <h2>Patient-first services</h2>
          <div className="service-grid">
            <article>
              <h3>Smart Scheduling</h3>
              <p>Real-time slots with instant confirmation and reminders.</p>
            </article>
            <article>
              <h3>Specialist Discovery</h3>
              <p>Filter doctors by department, expertise, and consultation fee.</p>
            </article>
            <article>
              <h3>Admin Visibility</h3>
              <p>Track operations, appointments, and patient activity in one place.</p>
            </article>
          </div>
        </section>

        <section id="doctors" className="section">
          <h2>Featured Doctors</h2>
          {loadingDoctors && <p className="sub-copy">Loading doctors from database...</p>}
          <div className="doctor-grid">
            {publicDoctors.map((doctor) => (
              <article key={doctor.id} className="doctor-card">
                <div className="avatar">{doctor.name[0]}</div>
                <h3>{doctor.name}</h3>
                <p>{doctor.speciality}</p>
                <div className="doctor-meta">
                  <span>{doctor.department}</span>
                  <span>{doctor.fee}</span>
                </div>
              </article>
            ))}
            {!loadingDoctors && !publicDoctors.length && (
              <p className="sub-copy">No doctors available in the database.</p>
            )}
          </div>
        </section>

        <section id="booking" className="section booking-section">
          <div>
            <h2>Book Appointment</h2>
            <p>
              Fill in your details and reserve a convenient time slot. This demo UI
              is now fully React-driven and ready to connect to your MySQL-backed API.
            </p>
            {message && <p className="success">{message}</p>}
          </div>

          <form className="booking-form" onSubmit={handleSubmit}>
            <input
              placeholder="Patient name"
              value={formData.patientName}
              onChange={(event) =>
                setFormData((previous) => ({ ...previous, patientName: event.target.value }))
              }
              required
            />
            <input
              type="email"
              placeholder="Email address"
              value={formData.email}
              onChange={(event) =>
                setFormData((previous) => ({ ...previous, email: event.target.value }))
              }
              required
            />
            <select
              value={formData.doctorId}
              onChange={(event) =>
                setFormData((previous) => ({ ...previous, doctorId: event.target.value }))
              }
              required
            >
              <option value="">Select doctor</option>
              {publicDoctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} - {doctor.speciality}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={formData.date}
              onChange={(event) =>
                setFormData((previous) => ({ ...previous, date: event.target.value }))
              }
              required
            />
            <input
              type="time"
              value={formData.time}
              onChange={(event) =>
                setFormData((previous) => ({ ...previous, time: event.target.value }))
              }
              required
            />
            <button type="submit">Book appointment</button>
          </form>
        </section>
      </main>

      {showAdminLogin && (
        <div className="modal-overlay" onClick={() => setShowAdminLogin(false)}>
          <div className="login-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Admin Login</h3>
            <p>Use your admin email and password to access the admin panel.</p>

            <form className="booking-form" onSubmit={handleAdminLogin}>
              <input
                type="email"
                placeholder="Admin email"
                value={adminAuthData.email}
                onChange={(event) =>
                  setAdminAuthData((prev) => ({ ...prev, email: event.target.value }))
                }
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={adminAuthData.password}
                onChange={(event) =>
                  setAdminAuthData((prev) => ({ ...prev, password: event.target.value }))
                }
                required
              />
              {authMessage && <p className="error-message">{authMessage}</p>}
              <button type="submit">Login as Admin</button>
            </form>
          </div>
        </div>
      )}

      {showDoctorLogin && (
        <div className="modal-overlay" onClick={() => setShowDoctorLogin(false)}>
          <div className="login-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Doctor Login</h3>
            <p>Use your doctor account credentials to open your doctor workspace.</p>

            <form className="booking-form" onSubmit={handleDoctorLogin}>
              <input
                type="email"
                placeholder="Doctor email"
                value={doctorAuthData.email}
                onChange={(event) =>
                  setDoctorAuthData((prev) => ({ ...prev, email: event.target.value }))
                }
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={doctorAuthData.password}
                onChange={(event) =>
                  setDoctorAuthData((prev) => ({ ...prev, password: event.target.value }))
                }
                required
              />
              {authMessage && <p className="error-message">{authMessage}</p>}
              <button type="submit">Login as Doctor</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
