import '../node_modules/bootstrap/dist/css/bootstrap.min.css'
import { Button, Container } from "react-bootstrap"

function NoMetamask({ connect }) {
  return(<>
    <Container className='vh-100 display-1 d-flex flex-column align-items-center justify-content-center'>
    {
        window.ethereum && window.ethereum?.isMetaMask ?
        <>
            <p>Connessione a Metamask necessaria</p>
            <Button size="lg" onClick={connect}>Connetti</Button>
        </>
        :
        <p>Metamask non rilevato. Installalo o passa a un browser che lo supporti</p>
    }
    </Container>
  </>)
}

export default NoMetamask;
