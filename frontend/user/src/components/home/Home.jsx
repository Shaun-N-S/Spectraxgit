import './Home.css';
import HomePage from '../HomePage/HomePage'; // Import the new HomePage component

const Home = () => {

  

  // const user = useSelector((state) => state.user.users);

  return (
    <div className="bg-black text-white min-h-screen">
      
      <HomePage />
    </div>
  );
};

export default Home;
