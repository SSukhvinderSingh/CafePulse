/** Responsive container: full-bleed on mobile (<640px); elegant centered card frame on desktop without nested scroll traps. */
export default function PhoneFrame({ children }) {
  return (
    <div className="w-full sm:mx-auto sm:my-8 sm:max-w-[430px] sm:rounded-[40px] sm:border-[8px] sm:border-espresso-800 sm:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)]">
      <div className="min-h-screen sm:min-h-0 bg-gradient-to-b from-espresso-900 via-espresso-900 to-espresso-950 sm:rounded-[32px] overflow-hidden">
        {children}
      </div>
    </div>
  );
}
