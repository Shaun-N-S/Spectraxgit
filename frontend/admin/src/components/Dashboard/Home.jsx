import AdminDashboard from './AdminDashboard';

const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Dashboard */}
      <div className="min-w-0 p-4 sm:p-6">
        {/* <div className="absolute top-10 right-4 z-10">
         
        </div> */}
        <AdminDashboard />
      </div>
    </div>
  );
};

export default Home;
