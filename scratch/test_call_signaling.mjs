import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3005');

ws.on('open', () => {
  console.log('Test caller connected to WS');
  // Authenticate as anurag
  ws.send(JSON.stringify({
    type: 'auth',
    username: 'anurag'
  }));

  // After 500ms, initiate call to sapta1
  setTimeout(() => {
    console.log('Sending call:initiate to sapta1...');
    ws.send(JSON.stringify({
      type: 'call:initiate',
      recipient: 'sapta1',
      sender: 'anurag',
      callType: 'video',
      caller: {
        username: 'anurag',
        name: 'Anurag Sharma',
        profilePic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
      }
    }));
  }, 500);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('Received response on caller socket:', msg);
  if (msg.type === 'call:accept') {
    console.log('SUCCESS! Recipient accepted the call!');
    process.exit(0);
  } else if (msg.type === 'call:reject') {
    console.log('Recipient rejected the call:', msg.reason);
    process.exit(0);
  }
});
