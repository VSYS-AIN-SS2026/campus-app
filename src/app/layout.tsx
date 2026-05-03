import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
	title: 'Campus App',
	description: 'Campus management app',
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="de">
			<body>{children}</body>
		</html>
	)
}
