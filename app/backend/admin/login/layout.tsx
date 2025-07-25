export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#F7F9FC]">
        {children}
      </body>
    </html>
  )
}