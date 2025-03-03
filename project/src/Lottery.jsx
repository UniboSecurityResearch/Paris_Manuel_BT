import { useState, useEffect } from 'react'
import { Container, Row, Col, Button, Alert } from "react-bootstrap"
import { ToastContainer, toast } from 'react-toastify'
import Web3 from 'web3'
import NoMetamask from './NoMetamask'
import OwnerView from './OwnerView'
import UserView from './UserView'
import Access from './Access'
export default function Lottery() {

  const abi = require("./contract/abi.json")
  const web3 = new Web3(window.ethereum)
  const web3_wss = new Web3(new Web3.providers.WebsocketProvider("wss://ws.json-rpc.evm.testnet.iotaledger.net"))

  const contract_UUID = "d1035b95-bfd5-433b-934f-d61d9a39a8b2"

  const [error, setError] = useState(undefined)
  const [auth, setAuth] = useState(false)

  const [contractAddress, setContractAddress] = useState(undefined)
  const [contract, setContract] = useState(undefined)
  const [contract_wss, setContract_wss] = useState(undefined)
  const [account, setAccount] = useState(undefined)

  const [lotteryName, setLotteryName] = useState("")
  const [isOwner, setIsOwner] = useState(undefined)
  const [isLotteryOpen, setIsLotteryOpen] = useState(true)
  const [ticketsAvailable, setTicketsAvailable] = useState(true)

  const [lastTicketBought, setLastTicketBought] = useState(undefined)
  const [newTicketBought, setNewTicketBought] = useState(undefined)
  const [lastTicketAdded, setLastTicketAdded] = useState(undefined)
  const [newTicketAdded, setNewTicketAdded] = useState(undefined)
  const [closedFlag, setClosedFlag] = useState(false)

  useEffect(() => {
    if (contractAddress) {
      try {
        const newContract = new web3.eth.Contract(abi, contractAddress)
        const newContract_wss = new web3_wss.eth.Contract(abi, contractAddress)
        newContract.methods.check_UUID(contract_UUID).call({from: account})
        .then(result => {
          if (result) {
            setContract(newContract)
            setContract_wss(newContract_wss)
          } else throw new Error()
        })
        .catch(_ => {
          setError("ID lotteria non valido o errore nell'accesso")
          setContract(undefined)
          setContract_wss(undefined)
        })
      } catch (err) {
        setError("ID lotteria non valido o errore nell'accesso")
        setContract(undefined)
        setContract_wss(undefined)
      }
    } else {
      setContract(undefined)
      setContract_wss(undefined)
    }
  }, [contractAddress])

  useEffect(() => {
    if (account && contract && contract_wss) {
      contract_wss.events.ticket_registered()
      .on('data', async (event) => { 
        setNewTicketBought({participant: event.returnValues.participant, ticket: event.returnValues.ticket})
      }) 
      contract_wss.events.closed_lottery()
      .on('data', async () => {
        setClosedFlag(true)
      })
      contract_wss.events.ticket_published()
      .on('data', async (event) => {
        setNewTicketAdded(event.returnValues.ticket)
      })

      window.ethereum.on('accountsChanged', switch_accounts)

      return () => {
        contract_wss.removeAllListeners()
        window.ethereum.removeAllListeners()
      }
    }
  })

  useEffect(() => {
    if (account && contract && closedFlag) {
      toast.info(<p className='fs-3 m-0'>Lotteria chiusa!</p>, {autoClose: 10000})
      new Promise(resolve => setTimeout(resolve, 10000))
      .then(() => {
        check_lottery_open()
      })
    }
  }, [closedFlag])

  useEffect(() => {
    if (account && contract) {
      let usr_account = web3.utils.toChecksumAddress(account)
      if (newTicketBought && newTicketBought.participant !== usr_account && newTicketBought?.ticket !== lastTicketBought?.ticket) {
        setLastTicketBought(newTicketBought)
        toast.info(<p className='fs-3 m-0'>Un utente ha acquistato il biglietto {newTicketBought.ticket}!</p>, {autoClose: 10000})
        setNewTicketBought(undefined)
      }
      new Promise(resolve => setTimeout(resolve, 10000))
      .then(() => {
        check_ticket_availability()
      })
    }
  }, [newTicketBought])

  useEffect(() => {
    if (account && contract) {
      if (newTicketAdded && !isOwner && newTicketAdded !== lastTicketAdded) {
        setLastTicketAdded(newTicketAdded)
        toast.info(<p className='fs-3 m-0'>Nuovo biglietto {newTicketAdded} disponibile!</p>, {autoClose: 10000})
        setNewTicketAdded(undefined)
      }
      new Promise(resolve => setTimeout(resolve, 10000))
      .then(() => {
        check_ticket_availability()
      })
    }
  }, [newTicketAdded])

  useEffect(() => {
    if (account && contract) {
      check_lottery_manager()
    }
  }, [account])

  useEffect(() => {
    if (account && contract) {
      get_lottery_name()
      check_lottery_open()
      check_lottery_manager()
      check_ticket_availability()
    }
  }, [contract])

  useEffect(() => {
    if (isOwner !== undefined) setAuth(true)
  }, [isOwner])

  return (<>
      <Alert variant="danger" className="error-bar" show={error !== undefined} onClose={() => setError(undefined)} dismissible>
        <Alert.Heading className='display-6 fw-bold'>Errore!</Alert.Heading>
        <p className='m-0 fs-3'>{error}</p>
      </Alert>
      {
      !account ?
      <NoMetamask connect={connect_metamask} />
      :
      ( !contractAddress || !contract || !contract_wss ?
        <Access 
          web3={web3} 
          account={account}
          onLoad={setContractAddress}
          onError={setError}
        />
        :
        <Container className='vh-100 d-flex flex-column'>
          <Row className='mb-5'>
            <Col xs="auto">
              <p className='display-2'>Lotteria {lotteryName}</p>
            </Col>
            <Col xs="auto" className='d-flex align-items-center'>
              <Button variant='outline-secondary' size="lg" className="d-flex align-items-center" onClick={share_lottery}>
                <div className="copy-icon me-2" />
                Condividi
              </Button>
            </Col>
            <Col xs="auto" className='d-flex align-items-center ms-auto'>
              <Button variant='outline-secondary' size="lg" className='d-flex align-items-center' onClick={change_lottery}>
                <div className='back-icon me-2'/>
                Cambia lotteria
              </Button>
            </Col>
          </Row>
          {
            auth &&
            (isOwner ?
            <OwnerView 
              web3={web3} 
              contract={contract}
              account={account}
              isLotteryOpen={isLotteryOpen}
              newTicketBought={newTicketBought}
              onError={setError}
            />
            :
            <UserView 
              web3={web3} 
              contract={contract}
              account={account}
              isLotteryOpen={isLotteryOpen}
              ticketsAvailable={ticketsAvailable}
              onError={setError}
            />)
          }
          <ToastContainer theme="dark" newestOnTop position="bottom-center" />
        </Container>
      )
    }
  </>);

  async function connect_metamask() {
    try {
      let accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts.length)
        setAccount(accounts[0])
      else
        setAccount(undefined)
    } catch (err) {
      console.log(err)
      setError("Connessione già in corso. Apri metamask e accedi al tuo account")
      setAccount(undefined)
    }
  }

  function switch_accounts(accounts) {
    setAuth(false)
    setIsOwner(undefined)
    setAccount(accounts[0])
  }

  function change_lottery() {
    setAuth(false)
    setIsOwner(undefined)
    setClosedFlag(false)
    setContractAddress(undefined)
  }

  function share_lottery() {
    navigator.clipboard.writeText(contractAddress)
    toast(<p className='m-0'>ID lotteria {contractAddress} copiato!</p>)
  }

  async function get_lottery_name() {
    const result = await contract.methods.lottery_name().call({from: account})
    setLotteryName(result)
  }

  async function check_lottery_manager() {
    const result = await contract.methods.lottery_manager().call({from: account})
    let usr_account = account ? web3.utils.toChecksumAddress(account) : undefined;
    setIsOwner(result === usr_account);
  }

  async function check_lottery_open() {
    const result = await contract.methods.is_lottery_open().call({from: account});
    setIsLotteryOpen(result);
  }

  async function check_ticket_availability() {
    const result = await contract.methods.check_ticket_availability().call({from: account});
    setTicketsAvailable(result);
  }
}
