import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Legacy create route — redirects to Admin Dashboard.
 * Old bookmarks / deep links still resolve safely.
 */
export const AdminUserCreatePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/admin/dashboard", { replace: true });
  }, [navigate]);

  return null;
};

export default AdminUserCreatePage;
