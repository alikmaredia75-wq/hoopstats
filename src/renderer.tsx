import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>HoopStats - Basketball Tournament Stats</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{ __html: `
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  navy: '#0D1B2A',
                  'navy-light': '#152740',
                  'navy-lighter': '#1B3354',
                  accent: '#E8520A',
                  'accent-hover': '#FF6A20',
                },
                fontFamily: {
                  heading: ['"Barlow Condensed"', 'sans-serif'],
                  body: ['"Inter"', 'system-ui', 'sans-serif'],
                }
              }
            }
          }
        ` }} />
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <link href="/static/style.css" rel="stylesheet" />
      </head>
      <body class="bg-navy min-h-screen text-gray-100 font-body">{children}</body>
    </html>
  )
})
