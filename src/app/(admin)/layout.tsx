import { AuthProvider } from '@/components/auth/AuthProvider';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex flex-col md:flex-row min-h-screen bg-alabaster text-forest selection:bg-sage/30 font-sans">
        <AdminSidebar />
        <main className="flex-1 flex flex-col min-w-0 md:ml-64 p-4 md:p-8">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
