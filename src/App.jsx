import { StoreProvider, useStore } from './state/store.jsx';
import Header from './components/shared/Header.jsx';
import CustomerView from './components/customer/CustomerView.jsx';
import BaristaView from './components/barista/BaristaView.jsx';

function Shell() {
  const { state } = useStore();
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#2a1a12_0%,#120d0a_75%)] text-crema-100">
      <Header />
      <main>{state.view === 'customer' ? <CustomerView /> : <BaristaView />}</main>
    </div>
  );
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>;
}
