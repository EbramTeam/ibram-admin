import { useParams, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import { RequireAdmin } from './auth.jsx';
import { Support, Privacy, CyberCompliance } from './pages/InfoPages.jsx';
import Login from './pages/Login.jsx';
import UserLogin from './pages/UserLogin.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import FirstLoginPassword from './pages/FirstLoginPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Users from './pages/Users.jsx';
import UserDetail from './pages/UserDetail.jsx';
import UserRoles from './pages/UserRoles.jsx';
import AuditLog from './pages/AuditLog.jsx';
import AddUser from './pages/AddUser.jsx';
import Roles from './pages/Roles.jsx';
import AddRole from './pages/AddRole.jsx';
import Vendors from './pages/Vendors.jsx';
import VendorDetail from './pages/VendorDetail.jsx';
import VendorForm from './pages/VendorForm.jsx';
import { RolesProvider } from './rolesStore.jsx';
import { VendorsProvider } from './vendorsStore.jsx';
import { MasterProvider } from './masterStore.jsx';
import MasterHub from './pages/master/MasterHub.jsx';
import { DepartmentsList, ItemsList, UnitsList, CategoriesList } from './pages/master/MasterList.jsx';
import { DepartmentDetail, ItemDetail, UnitDetail, CategoryDetail } from './pages/master/MasterDetail.jsx';
import { DepartmentForm, ItemForm, UnitForm, CategoryForm } from './pages/master/MasterForm.jsx';
import { SettingsHub, SettingsGeneral, SettingsProcurement, SettingsNotifications } from './pages/SettingsPages.jsx';

// old edit links: editing a user happens on their detail page, editing a role on the roles page
function ToUser() {
  const { id } = useParams();
  return <Navigate to={`/users/${id}`} replace />;
}
function ToRoles() {
  const { key } = useParams();
  return <Navigate to="/roles" replace state={/^\d+$/.test(key) ? { selectId: Number(key) } : undefined} />;
}

export default function App() {
  return (
    <RolesProvider>
    <VendorsProvider>
    <MasterProvider>
    <Routes>
      {/* Authentication screens (no sidebar) */}
      <Route path="/login" element={<Login />} />
      <Route path="/user-login" element={<UserLogin />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/first-login-password" element={<FirstLoginPassword />} />

      {/* Footer pages: no design provided */}
      <Route path="/support" element={<Support />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/cyber-compliance" element={<CyberCompliance />} />

      {/* Admin system */}
      <Route element={<RequireAdmin><AppLayout /></RequireAdmin>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/users/new" element={<AddUser />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="/users/:id/permissions" element={<UserRoles />} />
        <Route path="/users/:id/edit" element={<ToUser />} />
        <Route path="/roles" element={<Roles />} />
        <Route path="/roles/new" element={<AddRole />} />
        <Route path="/roles/:key/edit" element={<ToRoles />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/vendors/new" element={<VendorForm />} />
        <Route path="/vendors/:id" element={<VendorDetail />} />
        <Route path="/vendors/:id/edit" element={<VendorForm edit />} />
        <Route path="/master-data" element={<MasterHub />} />
        <Route path="/master-data/departments" element={<DepartmentsList />} />
        <Route path="/master-data/departments/new" element={<DepartmentForm />} />
        <Route path="/master-data/departments/:id" element={<DepartmentDetail />} />
        <Route path="/master-data/departments/:id/edit" element={<DepartmentForm edit />} />
        <Route path="/master-data/items" element={<ItemsList />} />
        <Route path="/master-data/items/new" element={<ItemForm />} />
        <Route path="/master-data/items/:id" element={<ItemDetail />} />
        <Route path="/master-data/items/:id/edit" element={<ItemForm edit />} />
        <Route path="/master-data/units" element={<UnitsList />} />
        <Route path="/master-data/units/new" element={<UnitForm />} />
        <Route path="/master-data/units/:id" element={<UnitDetail />} />
        <Route path="/master-data/units/:id/edit" element={<UnitForm edit />} />
        <Route path="/master-data/categories" element={<CategoriesList />} />
        <Route path="/master-data/categories/new" element={<CategoryForm />} />
        <Route path="/master-data/categories/:id" element={<CategoryDetail />} />
        <Route path="/master-data/categories/:id/edit" element={<CategoryForm edit />} />
        <Route path="/settings" element={<SettingsHub />} />
        <Route path="/settings/general" element={<SettingsGeneral />} />
        <Route path="/settings/procurement" element={<SettingsProcurement />} />
        <Route path="/settings/notifications" element={<SettingsNotifications />} />
        <Route path="/audit-log" element={<AuditLog />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </MasterProvider>
    </VendorsProvider>
    </RolesProvider>
  );
}
