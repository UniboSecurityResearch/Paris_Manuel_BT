import React from 'react';
import { Helmet } from "react-helmet";
import ReactDOM from 'react-dom/client';
import '../node_modules/bootstrap/dist/css/bootstrap.min.css'
import './style.css'
import Lottery from './Lottery';
import ExecutionTimeTest from './tests/ExecutionTimeTest';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<>
  <Helmet>
    <title>Lotterie IOTA</title>
  </Helmet>
  <Lottery />
</>);