export default function MobileContainer({ children }) {
  return (
    <>
      <style>{`
        html, body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }

        #root {
          min-height: 100vh;
          width: 100%;
        }

        .mobile-container {
          width: 100%;
          min-height: 100vh;
        }

        @media (min-width: 480px) {
          #root {
            background-color: #111111;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px 0;
            min-height: 100vh;
          }

          .mobile-container {
            width: 100%;
            max-width: 430px;
            min-height: 100vh;
            border-radius: 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            overflow: hidden;
          }
        }
      `}</style>

      <div className="mobile-container">
        {children}
      </div>
    </>
  )
}
