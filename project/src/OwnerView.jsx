import { useState, useEffect } from 'react'
import { Row, Col, Stack, Button, InputGroup, Form, Modal, ListGroup, OverlayTrigger, Tooltip } from "react-bootstrap"
import { toast } from 'react-toastify'

export default function OwnerView({web3, contract, account, isLotteryOpen, newTicketBought, onError}) {

    const [modalShow, setModalShow] = useState(false)
    const [modalMode, setModalMode] = useState(0)
    const [ticketInputFocus, setTicketInputFocus] = useState(false)
    const [winningTicketInputFocus, setWinningTicketInputFocus] = useState(false)

    const [tickets, setTickets] = useState([])
    const [winningTicketID, setWinningTicketID] = useState(undefined)
    const [ticketsSold, setTicketsSold] = useState(0)
    const [earningsRetrieved, setEarningsRetrieved] = useState(false)
    const [isCashedIn, setIsCashedIn] = useState(false)

    useEffect(() => {
        if (!isLotteryOpen) {
            check_earnings_retrieved()
            update_tickets_list()
            check_cashed_in()
        }
    }, [isLotteryOpen])

    useEffect(() => {
        new Promise(resolve => setTimeout(resolve, 10000))
        .then(() => {
            update_tickets_list()
        })
    }, [newTicketBought])

    return (<>
            <Row className='gx-5'>
                <Col xs={6} className='d-flex flex-column align-items-center justify-content-center mx-auto'>
                    <p className='m-0 fs-5 lh-1'>Lotteria</p>
                    {
                        isLotteryOpen ?
                        <p className='m-0 fw-bold display-5 text-success lh-1'>APERTA</p>
                        :
                        <p className='m-0 fw-bold display-5 text-danger lh-1'>CHIUSA</p>
                    }
                </Col>
                <Col xs={6}>
                <fieldset className="border border-3 rounded-3 p-3">
                    {
                        isLotteryOpen ?
                        <>
                        <legend className="float-none w-auto px-3">
                            Pannello gestore
                        </legend>
                        <Stack direction='horizontal' gap={3} className='w-auto'>
                            {
                                ticketsSold === 0 || ticketsSold > winningTicketID ?
                                <Button className="square-btn ms-auto" onClick={close_lottery}>Chiudi lotteria</Button>
                                :
                                <OverlayTrigger key="top" placement="top" overlay={<Tooltip><i>Nessuno dei partecipanti possiede il biglietto vincente</i></Tooltip>}>
                                    <span className="d-inline-block ms-auto">
                                        <Button className="square-btn" disabled style={{ pointerEvents: 'none' }}>Chiudi lotteria</Button>
                                    </span>
                                </OverlayTrigger>
                            }
                            <Button className="square-btn" onClick={() => {get_tickets(); setModalShow(true); setModalMode(0)}}>Modifica biglietto vincente</Button>
                            <Button className="square-btn" onClick={() => {setModalShow(true); setModalMode(1)}}>Aggiungi biglietto</Button>
                            <Button className="square-btn me-auto" onClick={() => {update_tickets_list(); setModalShow(true); setModalMode(2)}}>Visualizza biglietti</Button>
                        </Stack>
                        </>
                        :
                        <>
                        <legend className='float-none w-auto px-3'>
                            Resoconto lotteria
                        </legend>
                        <p><strong>{ticketsSold}</strong> biglietti venduti su <strong>{tickets.length}</strong></p>
                        <p><strong className='text-warning'>{ticketsSold*10} IOTA</strong> di guadagni totali</p>
                        {
                            ticketsSold > 0 &&
                            <>
                            <p>Il vincitore {isCashedIn ? <strong className='text-success'>ha già</strong> : <strong className='text-danger'>non ha ancora</strong>} ritirato la vincita di <strong className='text-warning'>{ticketsSold*10*0.7} IOTA</strong></p>
                            <p>{earningsRetrieved ? <strong className='text-success'>Hai già</strong> : <strong className='text-danger'>Non hai ancora</strong>} ritirato il tuo guadagno di <strong className='text-warning'>{ticketsSold*10*0.3} IOTA</strong></p>
                            </>
                        }
                        </>
                    }
                    </fieldset>
                </Col>
                
            </Row>
            {
            !isLotteryOpen &&
            <Row className='my-auto justify-content-center'>
                <Col xs="auto">
                    {
                        ticketsSold > 0 ?
                        <>
                        <p className='text-success w-100 mb-4 display-5'>La lotteria è terminata, riscatta i tuoi guadagni</p>
                        <Button variant="success" size="lg" className="w-100" onClick={retrieve_earnings} disabled={earningsRetrieved}>
                            {
                            earningsRetrieved ?
                            <i>Guadagni riscattati</i>
                            :
                            "Riscatta guadagni"
                            }
                        </Button>
                        </>
                        :
                        <p className='text-warning display-5'>Lotteria annullata</p>
                    }
                </Col>
            </Row>
            }
            { render_modal(modalMode) }
    </>);

    function render_modal(mode) {

        const modes = [
        {
            title: "Modifica biglietto vincente",
            body: 
            <Form onSubmit={change_winning_ticket}>
                <InputGroup>
                    <Form.Control type="number" max={tickets.length-1} placeholder="ID nuovo biglietto vincente" name="newWinningID" required onFocus={() => setWinningTicketInputFocus(true)} onBlur={() => setWinningTicketInputFocus(false)}/>
                    <Button variant="outline-secondary" type="submit">Cambia</Button>
                </InputGroup>
                { winningTicketInputFocus && <Form.Text className='ms-2'>{tickets.length} biglietti totali</Form.Text> }
            </Form>
        }, {
            title: "Aggiungi biglietto",
            body: 
            <Form onSubmit={add_ticket}>
                <InputGroup>
                    <Form.Control type="text" pattern="\d{4}" placeholder="Nuovo biglietto" name="newTicket" autoComplete='off' required onFocus={() => setTicketInputFocus(true)} onBlur={() => setTicketInputFocus(false)}/>
                    <Button variant="outline-secondary" type="submit">Aggiungi</Button>
                </InputGroup>
                { ticketInputFocus && <Form.Text className='ms-2'>ID da 4 cifre</Form.Text> }
            </Form>
        }, {
            title: "Biglietti",
            body:
            <ListGroup variant="flush">
                { tickets.map((ticket, i) => {return <ListGroup.Item className={i === winningTicketID ? "text-success fw-bold" : ""}>{ticket}{i < ticketsSold ? <i className='text-danger fw-normal'> Acquistato</i> : ""}</ListGroup.Item>}) }
            </ListGroup>
        }
        ];
        return (<>
        <Modal show={modalShow} onHide={() => setModalShow(false)} centered>
            <Modal.Header closeButton>
            <Modal.Title>{modes[mode].title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>{modes[mode].body}</Modal.Body>
        </Modal>
        </>);
    }

    async function add_ticket(e) {
        e.preventDefault();
        const data = new FormData(e.target);
        let newTicket = parseInt(data.get("newTicket"));
        if (tickets.includes(BigInt(newTicket))) onError("ID biglietto già inserito")
        else {
            try {
                const gasPrice = await web3.eth.getGasPrice();
                await contract.methods.add_ticket(newTicket).send({from: account, gasPrice: gasPrice});
                setModalShow(false);
                toast(<p className='m-0'>Biglietto {newTicket} aggiunto!</p>)
            } catch (err) {
                onError("Errore nell'aggiunta del biglietto")
            }
        }
    }

    async function change_winning_ticket(e) {
        e.preventDefault();
        const data = new FormData(e.target);
        let newWinningID = parseInt(data.get("newWinningID"));

        try {
            const gasPrice = await web3.eth.getGasPrice();
            await contract.methods.change_winning_ticket(newWinningID).send({from: account, gasPrice: gasPrice});
            setModalShow(false);
            setWinningTicketID(newWinningID)
            toast(<p className='m-0'>Biglietto vincente modificato in {tickets[newWinningID]}!</p>)
        } catch (err) {
            onError("Errore nel cambio del biglietto vincente")
        }
    }

    async function update_tickets_list() {
        get_tickets(); 
        check_winning_ticket();
        count_tickets_sold();
    }

    async function get_tickets() {
        const result = await contract.methods.check_tickets().call({from: account});
        setTickets(result);
    }

    async function check_winning_ticket() {
        const result = await contract.methods.check_winning_ticket().call({from: account});
        setWinningTicketID(parseInt(result));
    }

    async function count_tickets_sold() {
        const result = await contract.methods.check_ticket_allotment().call({from: account});
        setTicketsSold(parseInt(result));
    }

    async function close_lottery() {
        try {
            const gasPrice = await web3.eth.getGasPrice();
            await contract.methods.close_lottery().send({from: account, gasPrice: gasPrice});
        } catch (err) {
            onError("Errore nella chiusura della lotteria")
        }
    }

    async function check_cashed_in() {
        const result = await contract.methods.cashed_in().call({from: account})
        setIsCashedIn(result);
    }

    async function check_earnings_retrieved() {
        const result = await contract.methods.earnings_retrieved().call({from: account})
        setEarningsRetrieved(result);
    }

    async function retrieve_earnings() {
        try {
            const gasPrice = await web3.eth.getGasPrice();
            await contract.methods.retrieve_earnings().send({from: account, gasPrice: gasPrice});
            await check_earnings_retrieved();
            const amount = await contract.methods.earned_amount().call({from: account})
            toast.success(<p className='fs-3 m-0'>Hai incassato <span className='text-warning'>{web3.utils.fromWei(amount, "ether")} IOTA</span> con successo!</p>, {autoClose: false});
        } catch (err) {
            onError("Errore nel ritiro dei guadagni")
        }
    }
}
