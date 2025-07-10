import { Link } from "react-router-dom";

export default function NavBar() {
  return (
    <nav style={{
      padding: "1rem",
      textAlign: "center",
      backgroundColor: "black"
    }}>
      <Link to="/" style={linkStyle}>Home</Link> |{" "}
      <Link to="/about" style={linkStyle}>About</Link> |{" "}
      <Link to="/privacy" style={linkStyle}>Privacy</Link> |{" "}
      <Link to="/terms" style={linkStyle}>Terms</Link> |{" "}
      <Link to="/contact" style={linkStyle}>Contact</Link>
    </nav>
  );
}

const linkStyle = {
  color: "violet",
  textDecoration: "none",
  fontWeight: "500",
  margin: "0 0.5rem"
};
