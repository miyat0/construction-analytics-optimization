import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Legacy create route — user creation now happens via modal on Users & Roles.
 * Kept so old bookmarks / deep links still work.
 */
export const AdminUserCreatePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/admin/users", {
      replace: true,
      state: { openAddUser: true },
    });
  }, [navigate]);

  return null;
};

export default AdminUserCreatePage;
