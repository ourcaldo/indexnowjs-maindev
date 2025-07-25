export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This layout bypasses the admin sidebar layout completely
  return children
}