import Fanjal from './Fanjal';

export default function Loading({ text }: { text: string }) {
  return (
    <div className="loading" role="status">
      <Fanjal size={96} mood="think" />
      <p className="display" style={{ fontSize: '1.3rem' }}><span className="dots">{text}</span></p>
    </div>
  );
}
