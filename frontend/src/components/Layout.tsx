import { NavLink, Outlet } from 'react-router'

function Layout() {
  return (
    <>
      <header>
        <h1>BSP Takehome</h1>
        <nav>
          <NavLink to="/" end>
            Home
          </NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  )
}

export default Layout
