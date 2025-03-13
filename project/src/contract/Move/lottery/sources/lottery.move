
/// Module: lottery
/// Questa è una versione in linguaggio Move dello Smart Contract Lottery sviluppato in Solidity per questo progetto
/// È da tenere in considerazione che non è stato testato in modo approfondito,
/// e potrebbe quindi contenere sviste non rilevate
#[allow(lint(self_transfer))]
module lottery::lottery {

    // === IMPORTS ===

    use std::string::{String};
    use iota::coin::{Self, Coin};
    use iota::balance::{Self, Balance};
    use iota::iota::IOTA;
    use iota::hash;
    use iota::event;


    // === ERROR CODES ===

    const WINNING_TICKET_OUT_OF_BOUNDS: u64 = 0;
    const LOTTERY_ALREADY_CLOSED: u64 = 1;
    const LOTTERY_STILL_OPEN: u64 = 2;
    const NO_WINNER_YET: u64 = 3;
    const PURCHASE_NOT_PERMITTED: u64 = 4;
    const ALREADY_PURCHASED: u64 = 5;
    const TICKETS_SOLD_OUT: u64 = 6;
    const INCORRECT_PAYMENT: u64 = 7;
    const NOT_WINNER: u64 = 8;
    const WINNING_ALREADY_CASHED_IN: u64 = 9;
    const EARNINGS_ALREADY_RETRIEVED: u64 = 10;


    // === PRIVILEGES STRUCTS ===

    // Risorsa assegnata al gestore della lotteria, che potrà usare come "chiave" per ottenere i permessi
    // L'abilità "key" permette alla struct di essere memorizzata nello storage, e necessita di un campo UID
    public struct ManagerRights has key { id: UID }


    // === DATA STRUCTS ===

    // Risorsa unica e pubblica, contenente lo stato e le variabili della lotteria
    public struct LotteryState has key {
        id: UID,
        balance: Balance<IOTA>,                         // Bilancio di token IOTA della lotteria
        lottery_manager: address,                       // Indirizzo del gestore
        lottery_name: String,                           // Nome della lotteria
        tickets: vector<u64>,                           // Array dei biglietti
        winning_ticket_id: u64,                         // Indice del biglietto vincente
        ticket_allotment: u64,                          // Indice del prossimo biglietto da assegnare / biglietti venduti
        ticket_registry: vector<address>,               // Lista contenente gli indirizzi degli utenti che acquistano un biglietto
        is_lottery_open: bool,                          // Booleano apertura lotteria
        cashed_in: bool,                                // Booleano vincita riscossa
        earnings_retrieved: bool,                       // Booleano guadagni ritirati
        winning_amount: u64,                            // Quantità della vincita
        earned_amount: u64                              // Quantità dei guadagni
    }

    // Risorsa assegnata a ciascun partecipante che acquista un biglietto
    // Può essere utilizzata anche per garantire i permessi da partecipante
    public struct Participant has key {
        id: UID,
        ticket_id: u64  // Indice del biglietto acquistato
    }

    // === EVENTS STRUCTS ===

    // Evento emesso quando il gestore aggiunge un nuovo biglietto
    public struct TicketPublished has copy, drop {
        ticket: u64 // Identificativo numerico del biglietto aggiunto
    }

    // Evento emesso quando un utente acquista un biglietto
    public struct TicketRegistered has copy, drop {
        participant: address,   // Indirizzo dell'utente
        ticket: u64             // Identificativo numerico del biglietto acquistato
    }

    // Evento emesso quando il gestore chiude la lotteria
    public struct ClosedLottery has copy, drop { }


    // === MODULE INIZIALIZER ===

    // Funzione chiamata al deploy, necessita di prendere in input il contesto con le informazioni della transazione
    // Non può prendere in input direttamente dei parametri a scelta, quindi i dati della lotteria vengono solo inizializzati
    fun init(ctx: &mut TxContext) {

        // Assegna al chiamante la risorsa ManagerRights
        let lottery_manager = tx_context::sender(ctx);
        transfer::transfer(ManagerRights { id: object::new(ctx) }, lottery_manager);

        // Inizializza la risorsa con lo stato della lotteria
        // La memorizza come risorsa unica e condivisa
        // Chiunque può accederci tramite il suo ID
        let lottery = LotteryState {
            id: object::new(ctx),
            balance: balance::zero(),
            lottery_manager,    // Se il nome della variabile è lo stesso del campo si può abbreviare in questo modo
            lottery_name: b"".to_string(),  // Sintassi per utilizzare String
            tickets: vector::empty<u64>(),
            winning_ticket_id: 0,
            ticket_allotment: 0,
            ticket_registry: vector::empty<address>(),
            is_lottery_open: true,
            cashed_in: false,
            earnings_retrieved: false,
            winning_amount: 0,
            earned_amount: 0
        };
        transfer::share_object(lottery);
    }

    // Funzione che inserisce effettivamente i parametri iniziali della lotteria, da chiamare dopo l'init
    // È necessario fornire l'ID della risorsa ManagerRights per chiamarla
    // Il gestore, a cui è stata assegnata, può ottenere esternamente l'ID visualizzando le risorse possedute
    // Richiede inoltre l'ID della risorsa condivisa LotteryState (&mut indica che la risorsa verrà modificata)
    // Tale ID si può ottenere dai risultati restituiti dalla transazione di deploy
    // Risulta quindi necessario inserirlo manualmente nel codice per le interazioni esterne
    // Prende infine in input i parametri per la lista dei biglietti, il biglietto vincente e il nome della lotteria
    public fun create_lottery(_: &ManagerRights, lottery: &mut LotteryState, new_tickets: vector<u64>, new_winning_ticket_id: u64, new_lottery_name: String) {
        assert!(new_winning_ticket_id < vector::length<u64>(&new_tickets), WINNING_TICKET_OUT_OF_BOUNDS);

        lottery.tickets = new_tickets;
        lottery.winning_ticket_id = new_winning_ticket_id;
        lottery.lottery_name = new_lottery_name;
    }


    // === MISC FUNCTIONS ===

    // Controlla che l'UUID fornito sia lo stesso del contract
    // Restituisce un booleano in base al risultato
    public fun check_UUID(uuid: String): bool {
        let contract_uuid = b"d1035b95-bfd5-433b-934f-d61d9a39a8b2".to_string();
        let valid = hash::keccak256(contract_uuid.as_bytes()) == hash::keccak256(uuid.as_bytes());
        valid   // Sintassi per restituire un valore
    }

    // Controlla che ci siano ancora biglietti disponibili da acquistare
    // Restituisce un booleano in base al risultato
    public fun check_ticket_availability(lottery: &LotteryState): bool {
        let available = lottery.ticket_allotment < vector::length<u64>(&lottery.tickets);
        available
    }

    // Restituisce il nome della lotteria
    public fun check_lottery_name(lottery: &LotteryState): String {
        lottery.lottery_name
    }


    // Restituisce il booleano di apertura/chiusura della lotteria
    public fun check_is_lottery_open(lottery: &LotteryState): bool {
        lottery.is_lottery_open
    }

    // Restituisce il booleano di vincita riscossa o meno dal vincitore
    public fun check_cashed_in(lottery: &LotteryState): bool {
        lottery.cashed_in
    }

    // Restituisce il booleano di guadagni ritirati o meno dal gestore
    public fun check_earnings_retrieved(lottery: &LotteryState): bool {
        lottery.earnings_retrieved
    }

    // Restituisce il valore della vincita
    public fun check_winning_amount(lottery: &LotteryState): u64 {
        lottery.winning_amount
    }

    // Restituisce il valore dei guadagni
    public fun check_earned_amount(lottery: &LotteryState): u64 {
        lottery.earned_amount
    }


    // === MANAGER FUNCTIONS ===

    // Permette al gestore di modificare il biglietto vincente, prendendo in input il nuovo indice
    public fun change_winning_ticket(_: &ManagerRights, lottery: &mut LotteryState, new_winning_ticket_id: u64) {
        assert!(lottery.is_lottery_open, LOTTERY_ALREADY_CLOSED);
        assert!(new_winning_ticket_id < vector::length<u64>(&lottery.tickets), WINNING_TICKET_OUT_OF_BOUNDS);

        lottery.winning_ticket_id = new_winning_ticket_id;
    }

    // Permette al gestore di aggiungere un nuovo biglietto, prendendo in input l'identificativo numerico
    public fun add_ticket(_: &ManagerRights, lottery: &mut LotteryState, new_ticket: u64) {
        assert!(lottery.is_lottery_open, LOTTERY_ALREADY_CLOSED);

        vector::push_back<u64>(&mut lottery.tickets, new_ticket);
        event::emit(TicketPublished { ticket: new_ticket });
    }

    // Permette al gestore di chiudere la lotteria
    public fun close_lottery(_: &ManagerRights, lottery: &mut LotteryState) {
        assert!(lottery.is_lottery_open, LOTTERY_ALREADY_CLOSED);
        assert!(lottery.ticket_allotment == 0 || (lottery.ticket_allotment >= 2 && lottery.ticket_allotment > lottery.winning_ticket_id), NO_WINNER_YET);

        lottery.is_lottery_open = false;
        event::emit(ClosedLottery {});
    }

    // Restituisce al gestore l'array dei biglietti
    public fun check_tickets(_: &ManagerRights, lottery: &LotteryState): vector<u64> {
        lottery.tickets
    }

    // Restituisce al gestore l'indice del biglietto vincente
    public fun check_winning_ticket(_: &ManagerRights, lottery: &LotteryState): u64 {
        lottery.winning_ticket_id
    }

    // Restituisce al gestore il numero di biglietti venduti
    public fun check_ticket_allotment(_: &ManagerRights, lottery: &LotteryState): u64 {
        lottery.ticket_allotment
    }

    // Permette al gestore di ritirare i guadagni al termine della lotteria
    public fun retrieve_earnings(_: &ManagerRights, lottery: &mut LotteryState, ctx: &mut TxContext) {
        assert!(!lottery.is_lottery_open, LOTTERY_STILL_OPEN);
        assert!(!lottery.earnings_retrieved, EARNINGS_ALREADY_RETRIEVED);

        lottery.earnings_retrieved = true;
        if (lottery.cashed_in) {
            // Se il vincitore ha già riscattato la vincita, 
            // l'intera parte rimanente del bilancio della lotteria spetta al gestore
            lottery.earned_amount = balance::value<IOTA>(&lottery.balance);
        } else {
            // Altrimenti, gli spetta il 30%
            lottery.earned_amount = balance::value<IOTA>(&lottery.balance) * 3 / 10;
        };
        
        // Ritira la parte del bilancio da trasferire al gestore
        let to_transfer = balance::split<IOTA>(&mut lottery.balance, lottery.earned_amount);
        // Rende il bilancio trasferibile
        let payment = coin::from_balance<IOTA>(to_transfer, ctx);
        // Trasferisce il pagamento al gestore
        transfer::public_transfer(payment, tx_context::sender(ctx));
    }


    // === PARTICIPANT FUNCTIONS ===

    // Permette a un utente di acquistare un biglietto
    // Il pagamento va fornito inserendo direttamente in input la risorsa dei token IOTA
    public fun buy_ticket(lottery: &mut LotteryState, payment: Coin<IOTA>, ctx: &mut TxContext) {
        assert!(lottery.is_lottery_open, LOTTERY_ALREADY_CLOSED);
        assert!(lottery.lottery_manager != tx_context::sender(ctx), PURCHASE_NOT_PERMITTED);
        assert!(vector::contains<address>(&lottery.ticket_registry, &tx_context::sender(ctx)), ALREADY_PURCHASED);
        assert!(lottery.ticket_allotment < vector::length<u64>(&lottery.tickets), TICKETS_SOLD_OUT);
        // Equivale a 10 IOTA
        assert!(coin::value(&payment) == 10_000_000_000, INCORRECT_PAYMENT);

        // Inserisce il pagamento nel bilancio della lotteria
        coin::put(&mut lottery.balance, payment);

        // Inserisce l'indirizzo del chiamante nella lista dei partecipanti
        vector::push_back<address>(&mut lottery.ticket_registry, tx_context::sender(ctx));
        // Crea una risorsa Participant e la assegna al chiamante
        let participant = Participant {
            id: object::new(ctx),
            ticket_id: lottery.ticket_allotment
        };
        transfer::transfer(participant, tx_context::sender(ctx));
        
        // Imposta l'indice del prossimo biglietto da assegnare
        lottery.ticket_allotment = lottery.ticket_allotment + 1;
        // Il valore fornito per il campo ticket equivale a tickets[ticket_allotment - 1]
        event::emit(TicketRegistered { participant: tx_context::sender(ctx), ticket: *vector::borrow<u64>(&lottery.tickets, lottery.ticket_allotment-1) });
    }
    
    // Restituisce a un partecipante l'identificativo numerico del proprio biglietto
    // È necessario fornire l'ID di una risorsa Participant
    // In questo modo viene anche verificato che il chiamante sia un utente che ha effettivamente acquistato un biglietto
    public fun check_ticket(lottery: &LotteryState, participant: &Participant): u64 {
        let ticket = *vector::borrow<u64>(&lottery.tickets, participant.ticket_id);
        ticket
    }

    // Controlla se il chiamante è il vincitore della lotteria
    // Restituisce un booleano in base al risultato
    public fun check_winning(lottery: &LotteryState, participant: &Participant): bool {
        assert!(!lottery.is_lottery_open, LOTTERY_STILL_OPEN);

        let winner = participant.ticket_id == lottery.winning_ticket_id;
        winner
    }

    // Permette al vincitore di ritirare la vincita al termine della lotteria
    public fun cash_in_victory(lottery: &mut LotteryState, participant: &Participant, ctx: &mut TxContext) {
        assert!(!lottery.is_lottery_open, LOTTERY_STILL_OPEN);
        assert!(participant.ticket_id == lottery.winning_ticket_id, NOT_WINNER);
        assert!(!lottery.cashed_in, WINNING_ALREADY_CASHED_IN);

        lottery.cashed_in = true;
        if (lottery.earnings_retrieved) {
            // Se il gestore ha già ritirato i guadagni, 
            // l'intera parte rimanente del bilancio della lotteria spetta al vincitore
            lottery.winning_amount = balance::value<IOTA>(&lottery.balance);
        } else {
            // Altrimenti, gli spetta il 70%
            lottery.winning_amount = balance::value<IOTA>(&lottery.balance) * 7 / 10;
        };
        
        let to_transfer = balance::split<IOTA>(&mut lottery.balance, lottery.winning_amount);
        let payment = coin::from_balance<IOTA>(to_transfer, ctx);
        transfer::public_transfer(payment, tx_context::sender(ctx));
    }
}