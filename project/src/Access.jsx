import { useState } from 'react'
import { Container, Row, Col, FloatingLabel, Button, InputGroup, Form, Modal, ListGroup, CloseButton } from "react-bootstrap"
import { toast } from 'react-toastify'
import { bytecode } from './contract/bytecode'

export default function Access({ web3, account, onLoad, onError }) {

    const [showCreationModal, setShowCreationModal] = useState(false)
    const [ticketInputFocus, setTicketInputFocus] = useState(false)
    
    const [newTicket, setNewTicket] = useState("")
    const [ticketList, setTicketList] = useState([])
    const [winningTicket, setWinningTicket] = useState(0)
    const [lotteryName, setLotteryName] = useState("")

    return(<>
        <Container className='vh-100 d-flex flex-column'>
            <Row className='text-center'>
                <p className='display-1'>Lotterie IOTA</p>
            </Row>
            <Row className='my-auto'>
                <Col className='text-center d-flex flex-column justify-content-center align-items-center'>
                    <p className='display-5 mb-5'>Crea una lotteria</p>
                    <Button variant='secondary' size="lg" className="w-50" onClick={() => setShowCreationModal(true)}>Crea</Button>
                </Col>
                <Col className='text-center d-flex flex-column justify-content-center align-items-center'>
                    <p className='display-5 mb-5'>Partecipa a una lotteria</p>
                    <Form className='w-75' onSubmit={join_lottery}>
                        <InputGroup>
                            <Form.Control placeholder="ID lotteria" />
                            <Button type="submit" variant="outline-secondary">Partecipa</Button>
                        </InputGroup>
                    </Form>
                </Col>
            </Row>

            <Modal show={showCreationModal} onHide={() => setShowCreationModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Crea una lotteria</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <FloatingLabel label="Nome lotteria" className="mb-3">
                        <Form.Control type="text" placeholder="Nome lotteria" value={lotteryName} onChange={(e) => setLotteryName(e.target.value)} />
                    </FloatingLabel>
                    <ListGroup className='mb-3'>
                        {
                            ticketList.map((ticket, i) => { return <TicketListItem 
                            id={ticket} 
                            index={i} 
                            winningTicket={winningTicket} 
                            onDelete={deleteTicket} 
                            onSetWinning={setWinningTicket} />})
                        }
                    </ListGroup>
                    <InputGroup>
                        <Form.Control placeholder="ID biglietto" value={newTicket} autoComplete='off'
                            onChange={(e) => setNewTicket(e.target.value)} 
                            onFocus={() => setTicketInputFocus(true)}
                            onBlur={() => setTicketInputFocus(false)}
                        />
                        <Button variant="outline-secondary" onClick={addTicket}>Aggiungi</Button>
                    </InputGroup>
                    { ticketInputFocus && <Form.Text className='ms-2'>ID da 4 cifre</Form.Text> }
                </Modal.Body>
                <Modal.Footer>
                    <Button variant='secondary' onClick={create_lottery}>Crea</Button>
                    <Button variant='outline-danger' onClick={resetCreation}>Annulla</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    </>)

    function addTicket() {
        if (isNaN(Number(newTicket)))               onError("ID biglietto invalido. Solo caratteri numerici")
        else if (newTicket.length !== 4)            onError("ID biglietto invalido. 4 cifre necessarie")
        else if (ticketList.includes(newTicket))    onError("ID biglietto già inserito")
        else {
            setTicketList([...ticketList, newTicket])
            setNewTicket("")
        }
    }

    function deleteTicket(index) {
        if (index === winningTicket) setWinningTicket(0)
        setTicketList(ticketList.filter((_, i) => i !== index))
    }
    
    function resetCreation() {
        setTicketList([])
        setNewTicket("")
        setWinningTicket(0)
        setShowCreationModal(false)
    }

    async function create_lottery() {
        const trimmedName = lotteryName.trim()
        if (ticketList.length < 2)          onError("Una lotteria deve avere almeno 2 biglietti")
        else if (trimmedName.length === 0)  onError("Una lotteria deve avere un nome")
        else if (trimmedName.length > 50)   onError("Una lotteria deve avere un nome di massimo 50 caratteri")
        else {
            try {
                const abi = require("./contract/abi.json")
                const contract = new web3.eth.Contract(abi)
                contract.options.data = bytecode
                const gasPrice = await web3.eth.getGasPrice();
                const deployedContract = await contract.deploy({arguments: [ticketList, winningTicket, trimmedName]}).send({ from: account, gasPrice: gasPrice })
                onLoad(deployedContract.options.address)
                toast(<p className='m-0'>Lotteria {trimmedName} creata!</p>)
            } catch (err) {
                onError("Errore nella creazione della lotteria")
            }
        }
    }

    function join_lottery(e) {
        e.preventDefault()
        onLoad(e.target[0].value)
    }
}

function TicketListItem({ id, index, winningTicket, onDelete, onSetWinning }) {
    return(<>
        <ListGroup.Item className='d-flex align-items-center justify-content-between'>
            {id}
            <div className='d-flex align-items-center'>
                {
                    index === winningTicket ?
                    <Button variant="success" disabled>{"\u{2713}"} Vincente</Button>
                    :
                    <Button variant='outline-success' onClick={() => onSetWinning(index)}>Imposta vincente</Button>
                }
                <CloseButton onClick={() => onDelete(index)} className='ms-2'/>
            </div>
        </ListGroup.Item>
    </>)
}