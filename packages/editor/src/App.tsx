import { Layout, Header, Sidebar } from './layout';
import { Canvas } from './canvas';
import { Inspector } from './inspector';
import { Preview } from './preview/Preview';

export function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Header />
      
      <Layout
        left={<Sidebar />}
        center={<Canvas />}
        right={<Inspector />}
        preview={<Preview />}
      />
    </div>
  );
}
