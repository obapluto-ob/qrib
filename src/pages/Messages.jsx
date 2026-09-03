import { Navigate, useSearchParams } from "react-router-dom";

// /messages redirects to /student/messages preserving any query params
export default function Messages() {
  const [searchParams] = useSearchParams();
  const qs = searchParams.toString();
  return <Navigate to={`/student/messages${qs ? `?${qs}` : ""}`} replace />;
}
