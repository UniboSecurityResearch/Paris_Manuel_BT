import { useState, useEffect } from 'react'
import { Row, Col, Button } from "react-bootstrap"
import { toast } from 'react-toastify'

export default function UserView({web3, contract, account, isLotteryOpen, ticketsAvailable, onError}) {

    const [ticket, setTicket] = useState(undefined)
    const [isCashedIn, setIsCashedIn] = useState(false)
    const [isWinner, setIsWinner] = useState(false)

    useEffect(() => {
        check_ticket()
    }, [account])

    useEffect(() => {
        if (!isLotteryOpen && ticket) {
            check_winner()
            check_cashed_in()
        }
    }, [isLotteryOpen])

    useEffect(() => {
        if (!isLotteryOpen && ticket) check_winner()
    }, [ticket])

    return (<>
        <Row className='gx-5 mt-5'>
            <Col xs={6} className='d-flex flex-column align-items-center justify-content-center'>
                <p className='m-0 fs-5 lh-1'>Lotteria</p>
                {
                isLotteryOpen ?
                <p className='m-0 fw-bold display-5 text-success lh-1'>APERTA</p>
                :
                <p className='m-0 fw-bold display-5 text-danger lh-1'>CHIUSA</p>
                }
            </Col>
            <Col xs={6} className='d-flex flex-column align-items-center justify-content-center'>
                {
                    ticket ?
                    <>
                    <p className='m-0 fs-5 lh-1'>Biglietto</p>
                    <p className='m-0 fw-bold display-5 text-success lh-1'>{ticket}</p>
                    </>
                    :
                    <Button onClick={buy_ticket} disabled={!ticketsAvailable || !isLotteryOpen} size="lg" className='h-100 w-100 d-flex flex-column justify-content-center'>
                        {
                            ticketsAvailable && isLotteryOpen ?
                            <>
                            <span className='lh-1 fs-4'>Compra biglietto</span>
                            <span className='fs-6 text-warning'>10 IOTA</span>
                            </>
                            :
                            ( isLotteryOpen ?
                                <i>Biglietti esauriti</i>
                                :
                                <i>Lotteria terminata</i>
                            )
                        }
                    </Button>
                }
            </Col>
        </Row>
        {
            !isLotteryOpen &&
            <Row className='my-auto justify-content-center'>
            <Col xs="auto">
                {
                ticket ?
                (
                    isWinner ?
                    <><p className='text-success w-100 mb-4 display-5'>Congratulazioni! Hai vinto!</p>
                    <Button variant="success" size="lg" className="w-100" onClick={cash_in} disabled={isCashedIn}>
                    {
                        isCashedIn ?
                        <i>Vincita riscattata</i>
                        :
                        "Riscatta vincita"
                    }
                    </Button></>
                    :
                    <p className='text-danger display-5'>Non sei il vincitore</p>
                )
                :
                <p className='text-warning display-5'>La lotteria è già terminata</p>
                }
            </Col>
            </Row>
        }
    </>);

    async function check_ticket() {
        try {
            const result = await contract.methods.check_ticket().call({from: account});
            setTicket(result);
        } catch (err) {
            if (err.data.message.includes("You didn't get a ticket yet.")) setTicket(undefined)
        }
    }

    async function buy_ticket() {
        try {
            const gasPrice = await web3.eth.getGasPrice();
            await contract.methods.buy_ticket().send({from: account, gasPrice: gasPrice, value: web3.utils.toWei(10, "ether")});
            await check_ticket();
            toast(<p className='m-0'>Biglietto acquistato!</p>)
        } catch (err) {
            onError("Errore nell'acquisto del biglietto")
        }
    }

    async function check_winner() {
        const result = await contract.methods.check_winning().call({from: account})
        setIsWinner(result);
    }
    
    async function check_cashed_in() {
        const result = await contract.methods.cashed_in().call({from: account})
        setIsCashedIn(result);
    }

    async function cash_in() {
        try {
          const gasPrice = await web3.eth.getGasPrice();
          await contract.methods.cash_in_victory().send({from: account, gasPrice: gasPrice});
          await check_cashed_in();
          const amount = await contract.methods.winning_amount().call({from: account})
          toast.success(<p className='fs-3 m-0'>Hai incassato <span className='text-warning'>{web3.utils.fromWei(amount, "ether")} IOTA</span> con successo!</p>, {autoClose: false});
        } catch (err) {
            onError("Errore nell'incasso della vincita")
        }
    }   
}
