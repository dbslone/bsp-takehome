import { Link } from 'react-router'

function NotFoundPage() {
  return (
    <>
      <h2>Page not found</h2>
      <p>
        <Link to="/">Go back home</Link>
      </p>
    </>
  )
}

export default NotFoundPage
