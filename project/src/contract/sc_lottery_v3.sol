// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.25;

/** 
 * @title Lottery
 * @dev Implementa un sistema di lotteria
 */
contract Lottery {
    
    //Indirizzo del gestore della lotteria
    address public lottery_manager;

    //Partecipante alla lotteria
    struct Participant {
        uint ticket_id;     //ID del biglietto ottenuto
        bool got_ticket;    ///Se ha comprato un biglietto o meno
    }

    //Identificatore univoco degli Smart Contract Lottery
    string constant contract_UUID = "d1035b95-bfd5-433b-934f-d61d9a39a8b2";
    //Nome della lotteria
    string public lottery_name;
    //Array dei biglietti (numeri interi arbitrari)
    uint[] tickets;
    //ID (nell'array dei biglietti) del biglietto vincente
    uint winning_ticket_id;
    //ID (nell'array dei biglietti) da assegnare al prossimo richiedente (incrementale ad ogni richiesta)
    uint ticket_allotment = 0;
    
    bool public is_lottery_open = true;

    // Se il vincitore e il gestore hanno ritirato i propri guadagni
    bool public cashed_in = false;
    bool public earnings_retrieved = false;

    // La somma dei guadagni ottenuti dal vincitore e dal gestore
    uint public winning_amount = 0;
    uint public earned_amount = 0;

    //Mappa un indirizzo a un partecipante
    mapping(address => Participant) public participants;

    //Evento di assegnazione nuovo biglietto
    event ticket_registered(address participant, uint ticket);

    //Evento di chiusura lotteria
    event closed_lottery();

    //Evento di aggiunta nuovo biglietto dal gestore
    event ticket_published(uint ticket);

    /** 
     * @dev Crea una lotteria con un dato insieme di biglietti e un predeterminato biglietto vincente
     * @param new_tickets array dei biglietti della nuova lotteria
     * @param new_winning_ticket_id ID nell'array del biglietto vincente della nuova lotteria
     */
    constructor(uint[] memory new_tickets, uint new_winning_ticket_id, string memory new_lottery_name) {
        //Se l'ID del biglietto vincente è nel range dell'array dei biglietti
        require(new_winning_ticket_id < new_tickets.length, "Winning ticket ID out of range.");
        lottery_manager = msg.sender;
        tickets = new_tickets;
        winning_ticket_id = new_winning_ticket_id;
        lottery_name = new_lottery_name;
    }

    //Controlla se il richiedente è il gestore della lotteria
    modifier manager_rights() {
        require(msg.sender == lottery_manager, "Lottery manager restricted action.");
        _;
    }

    //Controlla se il richiedente ha ottenuto un biglietto o meno
    modifier is_participant() {
        require(participants[msg.sender].got_ticket, "You didn't get a ticket yet.");
        _;
    }

    //Controlla se la lotteria è aperta
    modifier lottery_open() {
        require(is_lottery_open, "Lottery is already closed");
        _;
    }
    modifier lottery_closed() {
        require(!is_lottery_open, "Lottery is still open");
        _;
    }

    /** 
     * @dev Verifica se l'UUID fornito è quello degli Smart Contract Lottery
     */
    function check_UUID(string memory uuid) public view returns (bool) {
        return keccak256(abi.encodePacked(uuid)) == keccak256(abi.encodePacked(contract_UUID));
    }

    /** 
     * @dev Vende un biglietto associandolo all'indirizzo del richiedente registrandolo alla lotteria
     */
    function buy_ticket() public payable lottery_open {
        require(msg.sender != lottery_manager, "Lottery manager cannot buy tickets.");
        require(ticket_allotment < tickets.length, "Tickets sold out");
        require(!participants[msg.sender].got_ticket, "You already got a ticket.");
        require(msg.value == 10 ether, "A ticket costs 10");
        Participant storage participant = participants[msg.sender];
        participant.ticket_id = ticket_allotment;
        participant.got_ticket = true;
        //Imposta l'ID del biglietto per il prossimo richiedente
        ticket_allotment = ticket_allotment + 1;
        //Segnala la registrazione
        emit ticket_registered(msg.sender, tickets[participant.ticket_id]);
    }

    /** 
     * @dev Controlla se è possibile acquistare un biglietto o sono esauriti
     * @return Booleano indicante se ci sono biglietti disponibili per l'acquisto o meno
     */
    function check_ticket_availability() public view returns (bool) {
        return ticket_allotment < tickets.length;
    }

    /** 
     * @dev Permette al gestore della lotteria di modificare l'ID del biglietto vincente
     */
    function change_winning_ticket(uint new_winning_ticket_id) public manager_rights lottery_open {
        require(new_winning_ticket_id < tickets.length, "Invalid ticket ID");
        winning_ticket_id = new_winning_ticket_id;
    }

    /** 
     * @dev Permette al gestore della lotteria di aggiungere un biglietto a quelli disponibili
     * @param new_ticket Nuovo biglietto da aggiungere
     */
    function add_ticket(uint new_ticket) public manager_rights lottery_open {
        tickets.push(new_ticket);
        emit ticket_published(new_ticket);
    }

    /** 
     * @dev Permette al gestore di chiudere la lotteria
     */
    function close_lottery() public manager_rights lottery_open {
        require(ticket_allotment == 0 || (ticket_allotment >= 2 && ticket_allotment > winning_ticket_id), "Cannot close lottery, none of the participants will win");
        is_lottery_open = false;
        emit closed_lottery();
    }

    /** 
     * @dev Permette al gestore di visualizzare tutti i biglietti
     */
    function check_tickets() public view manager_rights returns (uint[] memory) {
        return tickets;
    }

    /** 
     * @dev Permette al gestore di visualizzare l'ID del biglietto vincente
     */
    function check_winning_ticket() public view manager_rights returns (uint) {
        return winning_ticket_id;
    }

    /** 
     * @dev Permette al gestore di visualizzare quanti biglietti sono stati acquistati
     */
    function check_ticket_allotment() public view manager_rights returns (uint) {
        return ticket_allotment;
    }

    /** 
     * @dev Mostra il biglietto acquistato in precedenza dal richiedente
     * @return Biglietto del richiedente
     */    
    function check_ticket() public view is_participant returns (uint) {
        Participant storage participant = participants[msg.sender];
        return (tickets[participant.ticket_id]);
    }

    /** 
     * @dev Permette al possessore del biglietto vincente di riscuotere la vincita
     */    
    function cash_in_victory() public is_participant lottery_closed {
        Participant storage participant = participants[msg.sender];
        require(participant.ticket_id == winning_ticket_id, "Your ticket is not the winning ticket");
        require(!cashed_in, "Winning already cashed in.");

        cashed_in = true;
        if(earnings_retrieved)  // Se il gestore ha già ritirato la sua somma, il restante bliancio dello sc spetta al vincitore
            winning_amount = address(this).balance;
        else
            winning_amount = (address(this).balance * 7) / 10;  // 70% dei guadagni totali dai biglietti

        (bool success, ) = payable(msg.sender).call{value: winning_amount}("");
        require(success, "Error cashing in");
    }

    /** 
     * @dev Permette al gestore della lotteria di riscuotere i suoi guadagni
     */    
    function retrieve_earnings() public manager_rights lottery_closed {
        require(!earnings_retrieved, "Earnings already cashed in.");

        earnings_retrieved = true;
        if(cashed_in)  // Se il vincitore ha già riscattato la sua vincita, il restante bliancio dello sc spetta al gestore
            earned_amount = address(this).balance;
        else
            earned_amount = (address(this).balance * 3) / 10;  // 30% dei guadagni totali dai biglietti

        (bool success, ) = payable(msg.sender).call{value: earned_amount}("");
        require(success, "Error retrieving earnings");
    }

    /** 
     * @dev Comunica se il biglietto del richiedente è un biglietto vincente o meno
     * @return Booleano indicante se il biglietto è vincente o meno
     */
    function check_winning() public view is_participant lottery_closed returns (bool) {
        Participant storage participant = participants[msg.sender];
        return participant.ticket_id == winning_ticket_id;
    }
}