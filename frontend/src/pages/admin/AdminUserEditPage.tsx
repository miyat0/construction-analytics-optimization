import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

/** Legacy edit route → open Edit User modal on the Users list. */
export const AdminUserEditPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const parsedUserId = Number(userId);

  useEffect(() => {
    navigate("/admin/users", {
      replace: true,
      state: Number.isFinite(parsedUserId) ? { editUserId: parsedUserId } : null,
    });
  }, [navigate, parsedUserId]);

  return null;
};

export default AdminUserEditPage;
