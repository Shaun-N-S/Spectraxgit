import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axiosInstance from '../../axios/userAxios'; // Ensure this points to your Axios setup
import { addUser } from '../../redux/userSlice';

function ProtectEdit({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.user.user);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Verify the token by making a request to your backend
        await axiosInstance.post('/verifytoken', { withCredentials: true });

        // Restore Redux user state (e.g. after a hard refresh), matching the
        // same shape a normal login produces. Skipped if already populated
        // (client-side navigation) to avoid an unnecessary duplicate request.
        if (!currentUser) {
          try {
            const profileResponse = await axiosInstance.get('/profile');
            dispatch(addUser(profileResponse.data.user));
          } catch (profileError) {
            console.error('Failed to restore user profile:', profileError.message);
          }
        }

        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };

    verifyToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>; // Show a loading state while verifying
  }

  return isAuthenticated ? <Navigate to="/home" /> : children;
}

export default ProtectEdit;
