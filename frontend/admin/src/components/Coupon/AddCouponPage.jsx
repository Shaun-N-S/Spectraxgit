import AdminSidebar from './AdminSidebar';
import AddCoupon from './AddCoupon';

const AdminCouponPage = () => {
  return (
    <AdminSidebar>
      <div className="ml-[280px] p-6">
        <AddCoupon />
      </div>
    </AdminSidebar>
  );
};

export default AdminCouponPage;