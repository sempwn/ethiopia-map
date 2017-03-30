var s = new Random();

function Person(a,b) {
    //constructor(a,b) {
        this.b = s.gamma(a,b);
        this.M = 0.5;
        this.W = 0;
        this.WM = 0;
        this.WF = 0;
        this.I = 0;
        this.bednet = 0;
        this.t = 0;
        this.u = s.normal(params.u0,Math.sqrt(params.sigma));

    //}


    this.repRate = function(){
      if (params.nu == 0){

        if (this.WM>0){
          return this.WF;
        } else {
          return 0.0;
        }

      } else {
        return params.alpha * Math.min(this.WF ,(1/params.nu) * this.WM);
      }
    }

    this.biteRate = function(){
        if (this.a < 108.0){ //less than 9 * 12 = 108.0
            return this.a/108.0;
        }  else {
            return 1.0;
        }
    }

    this.react = function(){
          var bNReduction = 1 - (1-params.sN) * this.bedNet;
          //immune state update

          //I +=  (param->dt) *( (double) W - param->z * I);
          this.I = immuneRK4Step(this.W , this.I);
          //male worm update
          var births = poisson(0.5 * bNReduction * params.xi  * this.biteRate() * params.L3 * Math.exp(-1 * params.theta * this.I) * this.b *  params.dt); //exp(-1 * beta * I)
          //births = param->poisson_dist(0.5 * param->xi  * biteRate() * param->L3 * exp(-1 * param->theta * I) * b *  param->dt); //exp(-1 * beta * I)
          var deaths = poisson( params.mu *this.WM * params.dt );
          this.WM += births - deaths;

          //female worm update
          births = poisson(0.5 * bNReduction * params.xi * this.biteRate() * params.L3 * Math.exp(-1 * params.theta * this.I) * this.b  * params.dt); //* exp(-1 * beta * I)
          //births = param->poisson_dist(0.5  * param->xi  * biteRate() * param->L3 * exp(-1 * param->theta * I) * b *  param->dt); //exp(-1 * beta * I)
          deaths = poisson( params.mu * this.WF * params.dt );
          this.WF += births - deaths;

          //Mf update
          //births = poisson(param->alpha * WF * WM);
          //deaths = poisson(param->gamma * M);
          //M += births - deaths;
          this.M += params.dt * (this.repRate() - params.gamma * this.M);
          //M += param->dt * (repRate() - param->gamma * M);
          //total worm count
          this.W = this.WM+this.WF;
          //time-step
          this.t += params.dt;
          this.a += params.dt;
          //ensure all positive state variables remain positive
          if (this.W < 0){ this.W=0; }
          if (this.WM < 0){ this.WM = 0; }
          if (this.WF < 0){ this.WF = 0; }
          if (this.I < 0){ this.I = 0.0; }
          if (this.M < 0){ this.M = 0.0; }
          //simulate event where host dies and is replaced by a new host.
          if (Math.random() < (1 - Math.exp(-1 * params.tau * params.dt) ) || this.a>1200.0){ //if over age 100
            this.initialise();
            this.a = 0; //birth event so age is 0.

          }
      }

    this.initialise = function(){

      this.W = 0;
      this.WM = 0;
      this.WF = 0;
      this.I = 0.0;
      this.M = 0.0; //0
      this.bedNet = 0;
      this.u = s.normal(params.u0,Math.sqrt(params.sigma));
    }

}


function Model(n){
    //constructor(n){

        this.sU=0;
        this.sB=0;
        this.sN = 0;
        this.people = new Array();
        this.n = n;
        this.bedNetInt = 0;
        this.ts = [];
        this.Ms = [];
        this.Ws = [];
        this.Ls = [];
        for (var i = 0; i < n; i++) {
            this.people.push(new Person(params.a,params.b));
        }
    //}

    this.saveOngoing = function(t,mp,wp,lp){
        lp = 1-Math.exp(-lp); //convert to a prevalence
        this.ts.push(t);
        this.Ms.push(mp*100); //convert all to percentages.
        this.Ws.push(wp*100);
        this.Ls.push(lp*100);
    }

    this.L3 = function(){
      var mf = 0.0;
      var bTot = 0.0;
      for(var i=0; i < this.n; i++){
        //mf += param->kappas1 * pow(1 - exp(-param->r1 *( host_pop[i].mfConc() * host_pop[i].b)/param->kappas1), 2.0);
        mf += this.people[i].b * L3Uptake(this.people[i].M);
        bTot += this.people[i].b;
      }
      mf = mf / bTot; //(double) n;
      return mf * (1 + this.bedNetInt * params.covN * (params.sN - 1)) * params.lbda * params.g /(params.sig + params.lbda * params.psi1);

    }


    this.prevalence = function(){
        var p = 0;
        for (var i = 0; i < this.n; i++) {
            p += ( s.random() < (1 - Math.exp(-this.people[i].M)) );
        }
        return p/this.n;
    }

    this.aPrevalence = function(){
        var p = 0;
        for (var i = 0; i < this.n; i++) {
            p += (this.people[i].W>0);
        }
        return p/this.n;
    }

    this.MDAEvent = function(){
        for(var i = 0; i<this.n; i++){
          if (s.normal(this.people[i].u,1)<0){    //param->uniform_dist()<param->covMDA
            this.people[i].M = params.mfPropMDA * this.people[i].M;
            this.people[i].WM = Math.floor(params.wPropMDA * this.people[i].WM );
            this.people[i].WF = Math.floor(params.wPropMDA * this.people[i].WF );
          }
        }
    }

    this.bedNetEvent = function(){
        params.sig = params.sig + params.lbda * params.dN * params.covN;
        for(var i = 0; i<this.n; i++){
          if (s.random()<params.covN){    //param->uniform_dist()<param->covMDA
            this.people[i].bedNet = 1; //using bed-net
          } else {
            this.people[i].bedNet = 0; //not using bed-net
          }
        }
    }

    this.nRounds = function(){
      var inds = []
      for (var i = 0; i<this.Ms.length; i++){
        if(this.Ms[i] < 1.0){
          inds.push(i);
        }
      }
      if (params.mdaFreq == 12){
        return Math.floor(this.ts[inds[0]]);
      } else {
        return Math.floor(2*this.ts[inds[0]]);
      }
    }

    this.reduction = function(yr){
      var myr = yr*6;
      return this.Ms[myr]/this.Ms[0];
    }

    this.reductionYears = function(){
      var ryrs = [];
      for (var yr=0;yr<20;yr++){
        ryrs.push( this.reduction(yr) );
      }
      return ryrs;
    }

    this.evolveAndSaves = function(tot_t){
        var t = 0;
        var icount = 0;
        var maxMDAt = 1200.0;
        var maxoldMDAt; //used in triple drug treatment.
        this.bedNetInt = 0;

        for(var i =0; i < this.n; i++){ //infect everyone initially.
           //this.people[i].WM = 1;
           //this.people[i].WF = 1;
           this.people[i].M = 1.0;
        }
          maxMDAt = (1200.0 + params.nMDA * params.mdaFreq);
          if(params.IDAControl==1){ //if switching to IDA after five treatment rounds.
            maxoldMDAt = (1200.0+ 5.0 * params.mdaFreq);
          } else {
            maxoldMDAt = 2*maxMDAt; //this just makes maxoldMDAt larger than total treatment time so there is never a switch.
          }

        //double currentL3 = 0.5;
        console.log("mosquito species: ",params.mosquitoSpecies,"\n");
        params.L3 = 5.0;
        console.log("0----------100\n-");
          while(t< tot_t * 12.0){ //for 100 years update annually, then update monthly when recording and intervention is occuring.
            if (t<960.0){ //1200.0
              params.dt = 12.0;
            }else{
              params.dt = 1.0;
            }
            for(var i =0; i < this.n; i++){
              this.people[i].react();
            }
            //update
            t = this.people[0].t;
            if (t < 12.0 * 80.0){
                params.L3 = 2.0;
            } else {
                params.L3 = this.L3();
            }
            if((t % 2 == 0) && (t < Math.floor(t) +params.dt)){
                  //cout << "t = " << (double) t/12.0 << "\n";
                  this.saveOngoing(t/12.0,this.prevalence(),this.aPrevalence(),params.L3);
            }
            if ( (Math.floor(t) % Math.floor(tot_t * 12.0/10.0) == 0) && (t < Math.floor(t) + params.dt)){ //every 10% of time run.
              console.log("-");
              $( "#test1" ).append( ' p : ' + this.prevalence() + ' t : ' + t/12.0 );
            }
            if (t>=1200.0 && t < 1200.0 +params.dt){ //events that occur at start of treatment after 100 years.
              console.log("bednet event at ", t);
              this.bedNetEvent();
              this.bedNetInt = 1;
            }

            if ((t % params.mdaFreq == 0) && (t < Math.floor(t) + params.dt)){ //things that need to occur annually
              //if(t>maxoldMDAt){
              //  params.mfPropMDA = (1-params.IDAchi);//0.0;
              //  params.wPropMDA = (1-params.IDAtau);//0.0;
              //}
              if( (t>1200.0) && (t<= maxMDAt) ){ //if after one hundred years and less than 125 years.
                    this.MDAEvent();

                    setBR(true); //intervention true.
                    setVH(true);
                    setMu(true);
              } else {
                    setBR(false); //intervention false.
                    setVH(false);
                    setMu(false);
              }

            }
            icount++;
          }
          this.Ws = this.Ws.slice(200,this.Ws.length);
          this.Ms = this.Ms.slice(200,this.Ms.length);
          this.Ls = this.Ls.slice(200,this.Ls.length);
          var maxt = this.ts[200];
          this.ts = math.subtract(this.ts.slice(200,this.ts.length),maxt);
          //plot(this.ts,this.Ws,this.Ms,this.Ls);
        }


}


immuneRK4Step = function(W,I){
  var k1 = params.dt * (W - params.z*I);
  var k2 = params.dt * (W - params.z *(I + 0.5 * k1));
  var k3 = params.dt * (W - params.z *(I + 0.5 * k2));
  var k4 = params.dt * (W - params.z *(I + k3));
  return I + 0.1666667 * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
}

L3Uptake = function(mf){
  if(params.mosquitoSpecies==0){
    return params.kappas1 * Math.pow(1 - Math.exp(- params.r1 *( mf )/params.kappas1), 2.0);
  }
  else
  {
    return params.kappas1 * ( 1 - Math.exp(-params.r1 *( mf )/params.kappas1) );
  }
}

expTrunc = function(lambda,trunc){
  return (-1/ lambda)* Math.log(1- Math.random() *(1 - Math.exp(- lambda * trunc)) );
}

poisson = function(mean){
    var L = Math.exp(-mean);
    var p = 1.0;
    var k = 0;

    do {
        k++;
        p *= Math.random();
    } while (p > L);

    return (k - 1);

}

function NormSInv(p) {
    var a1 = -39.6968302866538, a2 = 220.946098424521, a3 = -275.928510446969;
    var a4 = 138.357751867269, a5 = -30.6647980661472, a6 = 2.50662827745924;
    var b1 = -54.4760987982241, b2 = 161.585836858041, b3 = -155.698979859887;
    var b4 = 66.8013118877197, b5 = -13.2806815528857, c1 = -7.78489400243029E-03;
    var c2 = -0.322396458041136, c3 = -2.40075827716184, c4 = -2.54973253934373;
    var c5 = 4.37466414146497, c6 = 2.93816398269878, d1 = 7.78469570904146E-03;
    var d2 = 0.32246712907004, d3 = 2.445134137143, d4 = 3.75440866190742;
    var p_low = 0.02425, p_high = 1 - p_low;
    var q, r;
    var retVal;

    if ((p < 0) || (p > 1))
    {
        console.error("NormSInv: Argument out of range.");
        retVal = 0;
    }
    else if (p < p_low)
    {
        q = Math.sqrt(-2 * Math.log(p));
        retVal = (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
    else if (p <= p_high)
    {
        q = p - 0.5;
        r = q * q;
        retVal = (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q / (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    }
    else
    {
        q = Math.sqrt(-2 * Math.log(1 - p));
        retVal = -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }

    return retVal;
}

setBR = function(intervention){
  if (intervention){
    params.lbda = params.lbdaR * params.lbda_original;
    params.xi = params.lbda * params.v_to_h * params.psi1 * params.psi2 * params.s2;
  } else {
    params.lbda = params.lbda_original;
    params.xi = params.lbda * params.v_to_h * params.psi1 * params.psi2 * params.s2;
  }
}

setVH = function(intervention){
  if (intervention){
    params.v_to_h = params.v_to_hR * params.v_to_h_original;
    params.xi = params.lbda * params.v_to_h * params.psi1 * params.psi2 * params.s2;
  } else {
    params.v_to_h = params.v_to_h_original;
    params.xi = params.lbda * params.v_to_h * params.psi1 * params.psi2 * params.s2;
  }
}

setMu = function(intervention){
  if (intervention){
    params.sig = params.sigR; //increase mortality due to bed nets. dN = 0.41 death rate
  } else {
    params.sig = params.sig_original;
  }
}


//var params = [];
var params = {
    riskMu1 : 1.0,
    riskMu2 : 1.0 ,
    riskMu3 : 1.0 ,
    shapeRisk : 0.065, //shape parameter for bite-risk distribution (0.1/0.065)
    mu : 0.0104, //death rate of worms
    theta : 0.0 , //0.001 //immune system response parameter. 0.112
    gamma : 0.1   , //mf death rate
    alpha : 0.58  , //mf birth rate per fertile worm per 20 uL of blood.
    lbda : 10  , //number of bites per mosquito per month.
    v_to_h : 9.0  ,  //vector to host ratio (39.,60.,120.)
    kappas1 : 4.395  , //vector uptake and development anophelene
    r1 : 0.055  , //vector uptake and development anophelene
    tau : 0.00167 ,  //death rate of population
    z : 0.0  ,  //waning immunity
    nu : 0.0  ,  //poly-monogamy parameter
    L3 : 0.0  ,  //larvae density.
    g : 0.37  , //Proportion of mosquitoes which pick up infection when biting an infected host
    sig : 5.0  , //death rate of mosquitos
    psi1 : 0.414  , //Proportion of L3 leaving mosquito per bite
    psi2 : 0.32  , //Proportion of L3 leaving mosquito that enter host
    dt : 1.0  , //time spacing (months)
    lbdaR : 1.0  , //use of bed-net leading to reduction in bite rate
    v_to_hR : 1.0 , //use of residual-spraying leading to reduction in v_to_h
    nMDA : 5  , //number of rounds of MDA
    mdaFreq : 12  , //frequency of MDA (months)
    covMDA : 0.65  , //coverage of MDA
    s2 : 0.00275  , //probability of L3 developing into adult worm.
    mfPropMDA : 0.05  , //proportion of mf removed for a single MDA round.
    wPropMDA : 0.45  , //proportion of worms permanently sterilised for a single MDA round. (0.55)
    rho : 0.0  , //proportion of systematic non-compliance 0- none 1- all.
    mosquitoSpecies : 0  , // 0 - Anopheles facilitation squared, 1 - Culex limitation linear.
    rhoBU : 0.0  , //correlation between bite risk and systematic non-compliance.
    aWol : 0  , //using doxycycline in intervention 0- not used, 1- is used.
    sigR : 5.0  , //new mortality rate of mosquitoes during vector intervention.
    covN : 0.0  , //coverage of bed nets.
    sysCompN : 0.99  , //systematic non-compliance of bed nets. set to near one.
    rhoCN : 0.0  , //correlation between receiving chemotherapy and use of bed nets.
    IDAControl : 0   //if 1 then programme switches to IDA after five rounds of standard MDA defined with chi and tau.
};

//calculate other parameters for params
params.lbda_original = params.lbda;
params.v_to_h_original = params.v_to_h;
params.sig_original = params.sig;
params.xi = params.lbda * params.v_to_h * params.psi1 * params.psi2 * params.s2; //constant bite rate (5760.0 / 30.0)
params.a = params.shapeRisk; //shape parameter (can vary)
params.b = 1/params.a; //scale parameter determined so mean is 1.
//bed net parameters
params.sN = 0.03;
params.dN=0.41;
//sys-compliance parameters
params.sigma = params.rho/(1-params.rho);
params.u0 = - NormSInv(params.covMDA) * Math.sqrt(1+params.sigma);

setPropMDA = function(regimen){
    ps = modelParams();
    chis = [0.99,0.95,0.99,1.0, Number(ps.microfilaricide)/100];
    taus = [0.35,0.55,0.1,1.0, Number(ps.macrofilaricide)/100];
    params.mfPropMDA = 1 - chis[Number(regimen)-1];
    params.wPropMDA = 1 - taus[Number(regimen)-1];
}

closest =  function(num, arr) {
    var mid;
    var lo = 0;
    var hi = arr.length - 1;
    while (hi - lo > 1) {
        mid = Math.floor ((lo + hi) / 2);
        if (arr[mid] < num) {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    if (num - arr[lo] <= arr[hi] - num) {
        return lo;
    }
    return hi;
}

setVHFromPrev = function(p,species){
  var anVH = [5., 5.55555556, 6.11111111, 6.66666667, 7.22222222, 7.77777778, 8.33333333, 8.88888889, 9.44444444,  10. ],
      cVH = [ 4.,  4.55555556,  5.11111111,  5.66666667,  6.22222222, 6.77777778,  7.33333333,  7.88888889,  8.44444444,  9.],
      anP = [ 0.09405936,  0.09882859,  0.11038997,  0.11982386,  0.12751358, 0.13604286,  0.14459468,  0.15150072,  0.15736517,  0.16302997],
      cP = [ 0.09306863,  0.11225442,  0.1267763 ,  0.13999753,  0.15040748, 0.16114762,  0.16863057,  0.17532108,  0.1827041 ,  0.18676246];
  if(species === 0){
    var vhs = anVH;
    var prevs = anP;
  }else{
    var vhs = cVH;
    var prevs = cP;
  }

  i = closest(p,prevs);
  return vhs[i];
}

setInputParams = function(dict){
    ps = modelParams();
    params.inputs = ps;
    params.nMDA = (dict.nMDA) ? dict.nMDA : Number(ps.mda);
    params.mdaFreq = (ps.mdaSixMonths==="True")? 6.0:12.0;
    var end = (dict.endemicity) ? dict.endemicity/100 : ps.endemicity/100;
    var sps = ps.species;
    params.v_to_h = Number(setVHFromPrev(end,Number(sps))); //Number(ps.endemicity);//
    params.covMDA = Number(ps.coverage/100.0);
    params.covN = Number(ps.covN/100);
    params.v_to_hR = 1-Number(ps.v_to_hR/100);
    params.vecCap = Number(ps.vecCap);
    params.vecComp = Number(ps.vecComp);
    params.vecD = Number(ps.vecD);
    setPropMDA(Number(ps.mdaRegimen));
    params.sysComp = Number(ps.sysComp);
    params.rhoBComp = Number(ps.rhoBComp);
    params.rhoCN = Number(ps.rhoCN);
    params.species = Number(ps.species);

    //calculate other parameters for params
    if (params.species == 0){
      params.shapeRisk = 0.065;
    } else {
      params.shapeRisk = 0.08;
    }
    params.lbda_original = params.lbda;
    params.v_to_h_original = params.v_to_h;
    params.sig_original = params.sig;
    params.xi = params.lbda * params.v_to_h * params.psi1 * params.psi2 * params.s2; //constant bite rate (5760.0 / 30.0)
    params.a = params.shapeRisk; //shape parameter (can vary)
    params.b = 1/params.a; //scale parameter determined so mean is 1.
    //sys-compliance parameters
    params.sigma = params.rho/(1-params.rho);
    params.u0 = - NormSInv(params.covMDA) * Math.sqrt(1+params.sigma);
}
plot = function(tx,wM,mfM,lM){
                  wM.unshift('worm_burden');
                  mfM.unshift('mf_burden');
                  lM.unshift('L3');
                  tx.unshift('tx');
                  c3.generate({
                      bindto: '#chart',
                      data: {
                        xs: {
                          worm_burden: 'tx',
                          mf_burden: 'tx',
                          L3: 'tx'

                        },
                        columns: [
                          tx,
                          wM,
                          mfM,
                          lM
                        ],
                        names: {
                          worm_burden: 'Worm burden',
                          mf_burden: 'mf burden',
                          L3: 'L3 density'
                        }
                      },
                       axis: {
                        x: {
                          label: 'time (years)',
                          tick: {
                            fit: false
                          }
                        },
                        y: {
                          label: 'Prevalence',
                          min: 0
                        }
                      },
                      legend: {
                        position: 'right'
                      },
                      zoom: {
                        enabled: true
                      },
                      type: 'spline'
                  });
}

var layout = { //main layout format for plot.ly chart
  title: 'Time-series',
  xaxis: {
    title: 'Time since start of intervention (yrs)',
    showgrid: false,
    zeroline: false
  },
  yaxis: {
    title: 'Prevalence',
    showline: false,
    rangemode: 'tozero',
    autorange: true,
    zeroline: true
  }
};


$(document).ready(function() {

tabCounter = 1;
roundsScenarioCounter = 1;

$("#set-mda-regimen").click(function(){
  $('#mda-table-box .alert').alert('close');
  var mdaType = $("#mda-form").html();
  var mdaCov = $('#coverage-form').html().replace('%','');
  var warning = false;
  if (mdaType=='IVM + ALB'){
    $("#mdaRegimenRadios1").prop("checked", true);
  }else if(mdaType=='DEC + ALB'){
    $("#mdaRegimenRadios2").prop("checked", true);
  } else {
    var content = $('#new-alert').html();
    var ps = modelParams();
    $('#mda-table-box').append(content);
    $('#mda-table-box .alert').addClass('alert-warning')
               .append('<strong> Warning! </strong> MDA regimen was not set. Current regimen is '+mdaDrugName(ps['mdaRegimen'])
                +'. See settings -> MDA tab for details.');
    warning = true;
  }
  $('#MDACoverage').slider('setValue', Number(mdaCov));
  if (warning ==false){
    var content = $('#new-alert').html();
    $('#mda-table-box').append(content);
    $('#mda-table-box .alert').addClass('alert-success')
              .append('<strong> Success! </strong> MDA parameters set. See settings -> MDA tab for details.');
  }

});


 $("#test-data").click(function(){
    paramSummary();
    $('#pleaseWaitDialog').modal('show');
    if ($('#model #mutliSimCheckBox').prop('checked')){
      $('#model #multiSimLoading').show();
      multiSimCompute();
    }else{

          setInputParams();
          var m = new Model(800);
          m.evolveAndSaves(120.0);
          console.log('No. rounds: ',m.nRounds());
          //plot.ly test
          var mfTs = {
            x: m.ts,
            y: m.Ms,
            type: 'scatter',
            name: 'microfilariaemia'
          };
          var wTs = {
            x: m.ts,
            y: m.Ws,
            type: 'scatter',
            name: 'antigenaemia'
          };
          var l3Ts = {
            x: m.ts,
            y: m.Ls,
            type: 'scatter',
            name: 'mosquito'
          };

          var plotlyData = [mfTs,wTs,l3Ts];
          layout.title = 'Time Series';
          Plotly.newPlot('plotlyChart', plotlyData, layout, {displayModeBar: false});

          //$("#model #test-data-result").html(m);
          //m.Ws.unshift('worm_burden');
          //m.Ms.unshift('mf_burden');
          //m.Ls.unshift('L3');
          //m.ts.unshift('tx');

          $('#pleaseWaitDialog').modal('hide');
          /*c3.generate({
              bindto: '#chart',
              data: {
                xs: {
                  worm_burden: 'tx',
                  mf_burden: 'tx',
                  L3: 'tx'

                },
                columns: [
                  m.ts,
                  m.Ws,
                  m.Ms,
                  m.Ls
                ],
                names: {
                  worm_burden: 'Worm burden',
                  mf_burden: 'mf burden',
                  L3: 'L3 density'
                }
              },
               axis: {
                x: {
                  label: 'time (years)',
                  tick: {
                    fit: false
                  }
                },
                y: {
                  label: 'Prevalence',
                  min: 0
                }
              },
              legend: {
                position: 'right'
              },
              tooltip: {
                format: {
                  title: function (d) { return 'Year ' + d; }

//            value: d3.format(',') // apply this format to both y and y2
                }
              },
              type: 'spline'
          });
*/

    }
  });
 $('#reset-rounds').click(function(){

    Plotly.newPlot('boxplotChart',[]);
    roundsScenarioCounter = 1;
    $('#rounds-scenario-accordion').html('');
 });
 $('#run-rounds').click(function() {
  $('#rounds-progress-bar').show();
  $('#roundsTest').show();
  $('#rounds-progress-bar-bar').css('width', 100+'%').attr('aria-valuenow', 100);
  $('#rounds-progress-bar').css('width','0%'); //this is a hack, but seems to work.
  setInputParams();
  params.nMDA = 40; //max number of mda rounds even if doing it six monthly.
  var maxN = $('#roundSims').val();
  var y0 = [];
  var progression = 0;

  var progress = setInterval(function()
  {

    $('#rounds-progress-bar').css('width',Number(progression*100/maxN)+'%');
    var m = new Model(800);
    m.evolveAndSaves(120.0);
    y0.push(m.nRounds());
    $('#roundsTest').html(progression*100/maxN + '%');
    if(progression == maxN) {
      $('#rounds-progress-bar').hide();
      $('#roundsTest').hide();
      clearInterval(progress);
      var boxPlotLayout = { //main layout format for plot.ly chart
        title: 'No. rounds to below 1% microfilariaemia',
        xaxis: {
          title: '',
          showgrid: false,
          zeroline: false
        },
        yaxis: {
          title: 'No. rounds',
          showline: false,
          rangemode: 'tozero',
          autorange: true,
          zeroline: true
        }
      };
      var trace1 = {
        y: y0,
        type: 'box',
        name: 'scenario ' + roundsScenarioCounter
      };
      if(roundsScenarioCounter==1){
        Plotly.newPlot('boxplotChart', [trace1],boxPlotLayout, {displayModeBar: false});
      } else {
        Plotly.addTraces('boxplotChart',[trace1]);
      }
      roundsScenarioCounter +=1;
    } else {
      progression += 1;
    }
  }, 10);

  var content = $('#new-scenario-accordian').html();
  $('#rounds-scenario-accordion').append(content);
  $('#rounds-scenario-accordion #headingOne').attr('id','heading'+roundsScenarioCounter);
  $('#rounds-scenario-accordion #heading'+roundsScenarioCounter+' a').attr('href','#collapse'+roundsScenarioCounter)
                                                                      .attr('aria-controls','collapse'+roundsScenarioCounter)
                                                                      .html('Scenario '+roundsScenarioCounter);
  $('#rounds-scenario-accordion #collapseOne').attr('id','collapse'+roundsScenarioCounter);
  $('#collapse'+roundsScenarioCounter).attr('aria-labelledby','heading'+roundsScenarioCounter);
  $('#collapse'+roundsScenarioCounter+' .panel-body').html(paramSummaryText(true));


            /*for(var i=0; i<10; i++){

    var m = new Model(800);
    m.evolveAndSaves(120.0);
    y0.push(m.nRounds());
    setTimeout(function(){
      $('.progress-bar').css('width', i*100/10+'%').attr('aria-valuenow', i*100/10);
      var trace1 = {
        y: y0,
        type: 'box'
      };
      Plotly.newPlot('boxplotChart', [trace1]);
    }
      ,1000);
  }
  */


 });

 $('#home li:not(.navbar) a').click(function (e) {
    //e.preventDefault();
    $(this).tab('show');
  });

  $('#vector a').click(function (e) {
    e.preventDefault();
    $(this).tab('show');
  });

  $('#mda a').click(function (e) {
    e.preventDefault();
    $(this).tab('show');
  });

  $('#rounds a').click(function (e) {
    e.preventDefault();
    $(this).tab('show');
  });

  $('#model a').click(function (e) {
    e.preventDefault();
    $(this).tab('show');
  });

  $('#adherence a').click(function (e){
    e.preventDefault();
    $(this).tab('show');
  });

  $('#test a').click(function (e) {
    e.preventDefault();
    $(this).tab('show');
  });

  $('#plus').click(function(){
    var a = $("<div role='tabpanel' class='tab-pane' id='model" + tabCounter + "'></div>");
    var content = $('#new-tab').html();
    $('.tab-content').append(a);
    $('div.tab-pane#model'+tabCounter).html(content);
    var b = $("<li role='presentation' "+tabCounter+"><a href='#model" + tabCounter + "' aria-controls='model' role='tab' data-toggle='tab'><button class='close closeTab' type='button' >x</button>Scenario " + tabCounter + " </a></li>");
    $('#nav-tabs li:last').prev().after(b);
    $('#model'+ tabCounter +' #plotlyChart').attr('id', 'plotlyChart' + tabCounter);
    $('#model'+ tabCounter +' #chart_mf').attr('id','model_'+ tabCounter +'_chart_mf');
    $('#model'+ tabCounter +' #chart_wb').attr('id','model_'+ tabCounter +'_chart_wb');
    $('#model'+ tabCounter +' #chart_L3').attr('id','model_'+ tabCounter +'_chart_L3');
    $('#model'+ tabCounter +' #multiSim').slider();


    $('#model'+ tabCounter + ' #multiSimSliderDiv').hide();
    $('#model'+ tabCounter + ' #multiSimLoading').hide();

    $( '#model'+ tabCounter + ' #mutliSimCheckBox' ).data( "tabIndex", tabCounter );
    $('#model'+ tabCounter + ' #simulation-title').html('Scenario '+ tabCounter);
    $('#model'+ tabCounter +' #mutliSimCheckBox').bind('click',function(){

      var d = $(this).data()['tabIndex'];
      toggle('#model'+ d + ' .multiSimGroup', this);
      toggleOff('#model'+ d + ' .singleSimGroup',this);
    });

    $( '#model'+ tabCounter + ' #test-data' ).data( "tabIndex", tabCounter );
    $('#model'+ tabCounter + ' #test-data').bind('click',function(){
      var d = $(this).data();
      runSimulation(d['tabIndex']);
    });

    $(".closeTab").bind('click',
      function () {

      //there are multiple elements which has .closeTab icon so close the tab whose close icon is clicked
      var tabContentId = $(this).parent().attr("href");
      $(this).parent().parent().remove(); //remove li of tab
      $('#myTab a:last').tab('show'); // Select first tab
      $(tabContentId).remove(); //remove respective tab content

    });

    $( 'a#model'+ tabCounter + " button").data( "tabIndex", tabCounter );
    $('.nav-tabs a[href="#model' + tabCounter + '"]').tab('show');
    tabCounter++;

  });

  $('#regimen-radio').bind('click', function(){

    if ($("input[name=mdaRegimenRadios]:checked").val()==5){
      $('#custom-regimen-sliders').show();

    } else {
      $('#custom-regimen-sliders').hide();
    }
  });

  $('#custom-regimen-sliders').hide();
  $('#Macrofilaricide').slider({});

  $('#Microfilaricide').slider({});


  $('#brMda').slider({});

  $('#sysAdherence').slider({});

  $('#bedNetMda').slider({});

  $('#endemicity').slider({
    formatter: function(value) {
      return value + '%';
    }

  });

  $('#roundSims').slider({});

  $('#MDACoverage').slider({
    formatter: function(value) {
      return value + '%';
    }
  });

  $('#bedNetCoverage').slider({
    formatter: function(value) {
      return value + '%';
    }
  });

  $('#insecticideCoverage').slider({
    formatter: function(value) {
      return value + '%';
    }
  });

  $('#multiSim').slider();
  $('#vectorialCapacity').slider();
  $('#vectorialCompetence').slider();
  $('#vectorialDeathRate').slider();

  $('#multiSimSliderDiv').hide();
  $('#multiSimLoading').hide();
  $('#rounds-progress-bar').hide();

  $('#termsModal').modal({show: true,
                          backdrop: 'static',
                          keyboard: false
  });


});

function toggle(className, obj) {
    var $input = $(obj);
    if ($input.prop('checked')) $(className).show();
    else $(className).hide();
}

function toggleOff(className, obj) {
    var $input = $(obj);
    if ($input.prop('checked')) $(className).hide();
    else $(className).show();
}

function modelParams(){
return {"mda" : $("#inputMDARounds").val(), "mdaSixMonths" : $("input:radio[name=mdaSixMonths]:checked").val(),
    "endemicity" : $('#endemicity').val(), "coverage": $("#MDACoverage").val(),
    "covN" : $('#bedNetCoverage').val(), "v_to_hR" : $('#insecticideCoverage').val(),
    "rho" : $('#sysAdherence').val(), "vecCap" : $('#vectorialCapacity').val(), "vecComp" : $('#vectorialCompetence').val(),
    "vecD" : $('#vectorialDeathRate').val(), "mdaRegimen" : $("input[name=mdaRegimenRadios]:checked").val(),
    "sysComp" : $('#sysAdherence').val(), "rhoBComp" : $('#brMda').val(), "rhoCN"  : $('#bedNetMda').val(),
    "species" : $("input[name=speciesRadios]:checked").val(),
    "macrofilaricide" : $('#Macrofilaricide').val(), "microfilaricide" : $('#Microfilaricide').val()
  }
}

function mdaDrugName(str){
var drug_name =""
switch(str){
  case "1":
    drug_name = "albendazole + ivermectin";
    break;
  case "2":
    drug_name = "albendazole + diethylcarbamazine";
    break;
  case "3":
    drug_name = "ivermectin";
    break;
  case "4":
    drug_name = "ivermectin + diethylcarbamazine + albendazole";
    break;
  case "5":
    drug_name = "custom regimen with " + $('#Macrofilaricide').val() + "% macrofilariae reduction, and " + $('#Microfilaricide').val() + "% microfilariae reduction";
}
return drug_name
}
function paramSummary(tabIndex){
if (tabIndex===undefined) tabIndex='';
str = paramSummaryText(false);
$('#model'+tabIndex+' #parameters-summary').text(str);

}
function paramSummaryText(noRounds){
noRounds = typeof noRounds !== 'undefined' ? noRounds : false;
var params = modelParams();
var str = 'Parameters used in this scenario are : ';
if(noRounds===false){
  str += (params['mda'])? params['mda'] + ' rounds ' : 'no MDA rounds ';
  if (params['mda']) str += 'of ' + mdaDrugName(params['mdaRegimen']) + ' MDA ';

  if (params['mda']) str += (params['mdaSixMonths']=="True")? 'occuring every six months ' : 'occuring annually ';
  str += (params['mda'])? 'with ' + params['coverage'] + '% coverage. ' : '. ';
} else {
  str += mdaDrugName(params['mdaRegimen']);
  str += (params['mdaSixMonths'])? ' occuring every six months ' : ' occuring annually ';
  str +=  'with ' + params['coverage'] + '% coverage. ';
}
str += 'Prevalence of microfilariaemia is on average ' + params['endemicity'] + '%. ';

str += 'Bed-net coverage is ' + params['covN'] + '% and ';
str += 'insecticide coverage is ' + params['v_to_hR'] + '%. ';
//str += 'Vectorial capacity is ' + params['vecCap'] + ', ';
//str += 'vector competence is ' + params['vecComp'] + ' and ';
//str += 'vector death rate is ' + params['vecD'] + ' relative to baseline.';
return str;

}

function multiSimCompute(tabIndex){
if (tabIndex === undefined) tabIndex='';
          setInputParams();
          var m = new Model(800);
          m.evolveAndSaves(120.0);


          $("#model"+ tabIndex + " #test-data-result").html(m);
          //m.Ws.unshift('worm_burden');
          //m.Ms.unshift('mf_burden');
          //m.Ls.unshift('L3');
          //m.ts.unshift('x');

          $('#pleaseWaitDialog').modal('hide');
          var firstRunI = Number($('#model'+ tabIndex +' #multiSim').val());
          $('.progress-bar').css('width', 0+'%').attr('aria-valuenow', 0);
          var mfTs = {
            x: m.ts,
            y: m.Ms,
            type: 'scatter',
            name: 'run ' + firstRunI
          };
          var wTs = {
            x: m.ts,
            y: m.Ws,
            type: 'scatter',
            name: 'run ' + firstRunI
          };
          var l3Ts = {
            x: m.ts,
            y: m.Ls,
            type: 'scatter',
            name: 'run ' + firstRunI
          };
          var mfLayout = jQuery.extend({},layout);
          mfLayout.title = 'microfilariaemia';

          Plotly.newPlot('model_'+ tabIndex +'_chart_mf', [mfTs], mfLayout, {displayModeBar: false});
          $('#model_'+ tabIndex +'_chart_mf,' +
            '#model_'+ tabIndex +'_chart_wb,' +
            '#model_'+ tabIndex +'_chart_L3').on('plotly_beforehover',function(){ //turn off hover events for multi-graphs.
            return false;
          });

          var wLayout = jQuery.extend({},layout);
          wLayout.title = 'antigenaemia';
          Plotly.newPlot('model_'+ tabIndex +'_chart_wb', [wTs], wLayout, {displayModeBar: false});
          var l3Layout = jQuery.extend({},layout);
          l3Layout.title = 'mosquito';
          Plotly.newPlot('model_'+ tabIndex +'_chart_L3', [l3Ts], l3Layout, {displayModeBar: false});
          /*chartMF=c3.generate({
              bindto: '#model'+ tabIndex +' #chart_mf',
              data: {
                x: 'x',
                columns: [
                  m.ts,
                  m.Ms

                ],
                names: {
                  mf_burden: 'mf burden'

                }
              },
               axis: {
                x: {
                  label: 'time (years)',
                  tick: {
                    fit: false
                  }
                },
                y: {
                  label: 'Prevalence',
                  min: 0
                }
              },
              legend: {
                position: 'right'
              },
              zoom: {
                enabled: true
              },
              tooltip: {
                format: {
                  title: function (d) { return 'Year ' + d; }

//            value: d3.format(',') // apply this format to both y and y2
                }
              },
              type: 'spline'
          });

          chartWB=c3.generate({
              bindto: '#model'+ tabIndex +' #chart_wb',
              data: {
                x: 'x',
                columns: [
                  m.ts,
                  m.Ws

                ],
                names: {
                  worm_burden: 'worm burden'

                }
              },
               axis: {
                x: {
                  label: 'time (years)',
                  tick: {
                    fit: false
                  }
                },
                y: {
                  label: 'Prevalence',
                  min: 0
                }
              },
              legend: {
                position: 'right'
              },
              zoom: {
                enabled: true
              },
              tooltip: {
                format: {
                  title: function (d) { return 'Year ' + d; }

//            value: d3.format(',') // apply this format to both y and y2
                }
              },
              type: 'spline'
          });

          chartL3=c3.generate({
              bindto: '#model'+ tabIndex +' #chart_L3',
              data: {
                x: 'x',
                columns: [
                  m.ts,
                  m.Ls

                ],
                names: {
                  worm_burden: 'L3'

                }
              },
               axis: {
                x: {
                  label: 'time (years)',
                  tick: {
                    fit: false
                  }
                },
                y: {
                  label: 'Prevalence',
                  min: 0
                }
              },
              legend: {
                position: 'right'
              },
              zoom: {
                enabled: true
              },
              tooltip: {
                format: {
                  title: function (d) { return 'Year ' + d; }

//            value: d3.format(',') // apply this format to both y and y2
                }
              },
              type: 'spline'
          });
*/

          addNewSim($('#model'+ tabIndex +' #multiSim').val()-1,tabIndex,firstRunI);


}

function addNewSim(i,tabIndex,firstRunI){
if(tabIndex===undefined) tabIndex='';
if (i>0){



            setInputParams();
            var m = new Model(800);
            m.evolveAndSaves(120.0);
            var mfTs = {
              x: m.ts,
              y: m.Ms,
              type: 'scatter',
              name: 'run ' + i
            };
            var wTs = {
              x: m.ts,
              y: m.Ws,
              type: 'scatter',
              name: 'run ' + i
            };
            var l3Ts = {
              x: m.ts,
              y: m.Ls,
              type: 'scatter',
              name: 'run ' + i
            };

            Plotly.addTraces('model_'+ tabIndex +'_chart_mf', mfTs);
            Plotly.addTraces('model_'+ tabIndex +'_chart_wb', wTs);
            Plotly.addTraces('model_'+ tabIndex +'_chart_L3', l3Ts);
            /*$("#model"+ tabIndex +" #test-data-result").html(m);
            m.Ws.unshift('worm_burden'+i);
            m.Ms.unshift('mf_burden'+i);
            m.Ls.unshift('L3'+i);
            m.ts.unshift('tx');


            chartMF.load({
                  columns: [
                    m.Ms
                  ],
                  names: {
                    mf_burden: 'mf burden '+i
                  }
                });

            chartWB.load({
                  columns: [
                    m.Ws
                  ],
                  names: {
                    worm_burden: 'worm burden '+i
                  }
                });

            chartL3.load({
                  columns: [
                    m.Ls
                  ],
                  names: {
                    L3: 'L3 '+i
                  }
                });
                */
            $('.progress-bar').css('width', (firstRunI-i+1)*100/firstRunI +'%').attr('aria-valuenow', (firstRunI-i+1)*100/firstRunI);
            i--;
            setTimeout(function () {
                addNewSim(i,tabIndex,firstRunI);
            },500);




} else {
  $('#model'+tabIndex+' #multiSimLoading').hide();
}

}

function runSimulation(tabIndex){

    paramSummary(tabIndex);
    //$('#pleaseWaitDialog').modal('show');
    if ($('#model'+tabIndex+' #mutliSimCheckBox').prop('checked')){
      $('#model'+tabIndex+' #multiSimLoading').show();
      multiSimCompute(tabIndex);
    }else{


          setInputParams();
          var m = new Model(800);
          m.evolveAndSaves(120.0);
          var mfTs = {
            x: m.ts,
            y: m.Ms,
            type: 'scatter',
            name: 'microfilariaemia'
          };
          var wTs = {
            x: m.ts,
            y: m.Ws,
            type: 'scatter',
            name: 'antigenaemia'
          };
          var l3Ts = {
            x: m.ts,
            y: m.Ls,
            type: 'scatter',
            name: 'mosquito'
          };

          var plotlyData = [mfTs,wTs,l3Ts];
          layout.title = 'Time Series';
          Plotly.newPlot('plotlyChart'+tabIndex, plotlyData, layout, {displayModeBar: false});
          /*$("#model"+ tabIndex +" #test-data-result").html(m);
          m.Ws.unshift('worm_burden');
          m.Ms.unshift('mf_burden');
          m.Ls.unshift('L3');
          m.ts.unshift('tx');

          $('#pleaseWaitDialog').modal('hide');
          c3.generate({
              bindto: '#model'+tabIndex+' #chart',
              data: {
                xs: {
                  worm_burden: 'tx',
                  mf_burden: 'tx',
                  L3: 'tx'

                },
                columns: [
                  m.ts,
                  m.Ws,
                  m.Ms,
                  m.Ls
                ],
                names: {
                  worm_burden: 'Worm burden',
                  mf_burden: 'mf burden',
                  L3: 'L3 density'
                }
              },
               axis: {
                x: {
                  label: 'time (years)',
                  tick: {
                    fit: false
                  }
                },
                y: {
                  label: 'Prevalence',
                  min: 0
                }
              },
              legend: {
                position: 'right'
              },
              zoom: {
                enabled: true
              },
              type: 'spline'
          }); */

    }

}




var glob_data;
var glob_prevs;
/*
DEFINE CLASS SESSION DATA TO STORE AND RETRIEVE RUNS.
Data structure
session ---- scenarios ---- ---- ---- params
                       ----      ---- label
                       ----      ---- stats   ----  ts
                       ----                   ----  doses
                       ----                   ----  prev_reds
                       ----                   ----  num_rounds
                       ----
                       ----      ---- results ----  ---- ---- Ws
                       ----                   ----       ---- Ms
                       ----                   ----       ---- ts
                                              ----       ---- doses


*/
function SessionData(){}

SessionData.storeResults =  function(results,scenLabel,stats){
  //takes results: an Array of json with each json obj having ts, Ms, Ws.
  //combines these with parameter information and stores to be retrieved whenever.
  var sessionData = JSON.parse(localStorage.getItem('sessionDataGhana')); //retrieve session dat from storage.
  if ( (sessionData == null) || (sessionData.scenarios == null) ){
    sessionData = {'scenarios':[]};
  }
  if(scenLabel==null){
    scenLabel = 'Scenario ' + (ScenarioIndex.getIndex()+1);
  }
  var scenario = {'params': params,'results' : results, 'label' : scenLabel};
  var scenInd = ScenarioIndex.getIndex();

  sessionData.scenarios[scenInd] = scenario;
  toStore = JSON.stringify(sessionData);
  localStorage.setItem('sessionDataGhana', toStore);
  return sessionData;

}

SessionData.storeStats = function(stats){
  var sessionData = JSON.parse(localStorage.getItem('sessionDataGhana')); //retrieve session dat from storage.
  var scenInd = ScenarioIndex.getIndex();
  sessionData.scenarios[scenInd]['stats'] = stats;
  toStore = JSON.stringify(sessionData);
  localStorage.setItem('sessionDataGhana', toStore);
}

SessionData.createNewSession = function(){
  var sessionData = JSON.parse(localStorage.getItem('sessionDataGhana'));
  if ( (sessionData == null) || (sessionData.scenarios == null) ){
    sessionData = {'scenarios':[]};
  }
  var scenario = {'params': params,'results' : []};
  var scenInd = ScenarioIndex.getIndex();

  sessionData.scenarios[scenInd] = scenario;
  toStore = JSON.stringify(sessionData);

}

SessionData.deleteSession = function(){
  //delete session data to start fresh when page loads.
  localStorage.setItem('sessionDataGhana', null);
}



SessionData.retrieveSession = function(){
  var ses = JSON.parse(localStorage.getItem('sessionDataGhana'));
  if (ses && ses.scenarios && ses.scenarios[0] && ses.scenarios[0].label){
    return ses
  } else {
    ses = {'scenarios':[]};
    toStore = JSON.stringify(ses);
    localStorage.setItem('sessionDataGhana', toStore);
    return ses
  }
}
SessionData.numScenarios = function(){
  var ses = SessionData.retrieveSession();
  if ( (ses == null) || (ses.scenarios == null) ){
    return 0;
  } else {
    return ses.scenarios.length;
  }
}
SessionData.convertRun = function(m,endemicity){
  //convert model object to JSON for run.
 return {'ts' : m.ts, 'Ms' : m.Ms, 'Ws': m.Ws,
 'reductionYears':m.reductionYears(),'nRounds' : m.nRounds(),
         'endemicity':endemicity}
}

SessionData.nRounds = function(i){
  var ses = SessionData.retrieveSession();
  var scen = ses.scenarios[i];
  var n = scen.results.length;
  var rounds = [];
  for (var j = 0; j < n; j++){
    rounds.push(scen.results[j].nRounds);
  }
  return rounds;
}

SessionData.reductions = function(i,yr,endemicity){
  var ses = SessionData.retrieveSession();
  var scen = ses.scenarios[i];
  var n = scen.results.length;
  red = 0;
  var nn = 0;
  for (var j = 0; j < n; j++){
    if(endemicity){
      if (scen.results[j].endemicity == endemicity){
        red += scen.results[j].reductionYears[yr];
        nn += 1;
      }
    }else{
      red += scen.results[j].reductionYears[yr];
      nn += 1;
    }
  }
  return red/nn;
}

SessionData.ran = function(i){
  var ses = SessionData.retrieveSession();

  if(!ses){ return false }
  if(!ses.scenarios[i]){ return false }

  var res = ses.scenarios[i].results;
  if(res.length>0){
    return true
  } else {
    return false
  }
}
SessionData.deleteScenario = function(){
  var ind = ScenarioIndex.getIndex();
  var ses = SessionData.retrieveSession();
  ses.scenarios.splice(ind,1);
  var toStore = JSON.stringify(ses);
  localStorage.setItem('sessionDataGhana', toStore);
  ScenarioIndex.setIndex(0);

}
/*
functions for retrieving current scenario index
*/
function ScenarioIndex(){}
ScenarioIndex.getIndex = function(){
  return Number(localStorage.getItem('scenarioIndex'));
}
ScenarioIndex.setIndex = function(ind){
  try{
    var ses = SessionData.retrieveSession();
    var scen = ses.scenarios[ind];
    params = scen.params;
    $('#scenario-title').html(ses.scenarios[ind].label + ' Overview');
  }catch(err){}

  return localStorage.setItem('scenarioIndex',ind);
}
/*
Specific mapping functions
*/
function clearSession(){
  bootbox.confirm("Are you sure you want to delete this session? This will remove all scenarios.", function(result) {
    if(result){
      SessionData.deleteSession();
      createScenarioBoxes();
      scenarioComparisonSelectVisibility();
      drawMap();
      drawComparisonPlot();
      $('#scenario-title').html('Scenario Overview');
    }
  });
}

function scenarioComparisonSelectVisibility(){
  var ses = SessionData.retrieveSession();
  var n = (ses && ses.scenarios)? ses.scenarios.length : 0;
  if (n>0){
    $('#sel-comp-stat-div').show();
  } else {
    $('#sel-comp-stat-div').hide();
  }
}
function scenarioRunStats(){
  var scenInd = ScenarioIndex.getIndex();
  var dfrd = $.Deferred();
  var ts = [],dyrs=[],ryrs=[];
  d3.json('./assets/Ghana.json',function(err,data){

      var ts=[];
      var dyrs = [];
      for (var t = 0; t < 20; t++){
        cLow = SessionData.reductions(scenInd,Math.floor(t),'low');
        cMedium = SessionData.reductions(scenInd,Math.floor(t),'medium');
        cHigh = SessionData.reductions(scenInd,Math.floor(t),'high');
        var stats = reductionStatsCalc(data,cLow,cMedium,cHigh,params.covMDA);
        dyrs.push(stats.doses);
        ts.push(t);
        ryrs.push((1-stats.reduction)*100);
      }
      console.log(ts);
      console.log(dyrs);
      SessionData.storeStats({'ts': ts,'prev_reds' : ryrs,'doses':dyrs});
      drawComparisonPlot();
    });


}
function createScenarioBoxes(){
  var ses = SessionData.retrieveSession();
  var curScen = ScenarioIndex.getIndex();
  n = (ses && ses.scenarios)? ses.scenarios.length : 0;
  d3.select('#scenario-button-group').html('');
  if(n>0){
    d3.select('#scenario-button-group').append('h4')
    .html('Select scenario to map:');
  }
  for(var i=0;i<n;i++){
    d3.select('#scenario-button-group').append('div')
      .attr('class','btn btn-primary btn-lg btn-block '.concat((i==curScen)? 'active':''))
      .attr('id','scenario-button-'+i)
      .attr('data-scenario-label',ses.scenarios[i].label)
      .attr('data-scenario',i)
      .attr('aria-pressed',(i==curScen))
      .html(ses.scenarios[i].label)
      .on('click',function(){
        ScenarioIndex.setIndex($('#'+this.id).data('scenario'));
        setmodelParams();
        fixInput();
        drawMap();
        $('#close_scenario').html('show scenario');
        $('#scenario-messages').html('<div class="alert alert-success alert-dismissible" role="alert">  '
        + $('#'+this.id).data('scenario-label')
        + ' set </div>');
        $(this).addClass("active").siblings().removeClass("active");
        $('#delete_scenario').removeClass('hidden').unbind().click(function(){
          bootbox.confirm("Are you sure you want to delete this scenario?", function(result) {
            if(result){
              SessionData.deleteScenario();
              createScenarioBoxes();
              scenarioComparisonSelectVisibility();
              drawComparisonPlot();
              drawMap();
              $('#settings-modal').modal('hide');
            }
          });
        });
        $('#settings-modal').modal('show');

        if(SessionData.ran(i)){
          $('#run_scenario').html('Display Scenario');
        }else{
          $('#run_scenario').html('Run Scenario');
        }
      });
  }
  if (n>0){
    d3.select('#scenario-button-group').append('div').attr('class','divider');
    d3.select('#scenario-button-group').append('div')
    .attr('class','btn btn-danger btn-lg btn-block ')
    .html('Clear Session')
    .on('click',clearSession);
  }

}

function drawComparisonPlot(){
  var ses = SessionData.retrieveSession();
  if (ses.scenarios.length > 0){
    var option = $('#sel-comp-stat').val();
    if (option=="doses"){
      drawDosesTimeLine();
    }else if (option=="rounds"){
      drawMapBoxPlot();
    } else if(option=="prev"){
      drawPrevalenceTimeLine();
    }
  } else {
    Plotly.newPlot('map-boxplot',[], {height:10,width:10},{displayModeBar: false});
  }
}

function drawDosesTimeLine(){ //TODO: fix this function.
  var orgScenInd = ScenarioIndex.getIndex();
  var ses = SessionData.retrieveSession();
  var n = ses.scenarios.length;
  var traces = [];
  var cLow,cMedium,cHigh;
  var timeline_plot_layout = { //main layout format for plot.ly chart
    autosize: true,
    title: 'Doses per year',
    xaxis: {
      title: 'time since start of intervention (yrs)',
      showgrid: true,
      zeroline: false
    },
    yaxis: {
      title: 'doses',
      showline: false,
      rangemode: 'tozero',
      autorange: true,
      zeroline: true
    }
  };


    for (var scenInd = 0; scenInd < n; scenInd ++)
    {
      var ts = ses.scenarios[scenInd].stats.ts;
      var dyrs = ses.scenarios[scenInd].stats.doses;


      var trace = {
        x: ts,
        y: dyrs,
        mode: 'lines+markers',
        name: ses.scenarios[scenInd].label
      };
      traces.push(trace);

    }
    console.log(traces);
    Plotly.newPlot('map-boxplot', traces, timeline_plot_layout, {displayModeBar: false});
    ScenarioIndex.setIndex(orgScenInd);




}

function drawPrevalenceTimeLine(){
  var orgScenInd = ScenarioIndex.getIndex();
  var ses = SessionData.retrieveSession();
  var n = ses.scenarios.length;
  var traces = [];
  var cLow,cMedium,cHigh;
  var timeline_plot_layout = { //main layout format for plot.ly chart
    autosize: true,
    title: 'Reduction in Prevalence (%)',
    xaxis: {
      title: 'time since start of intervention (yrs)',
      showgrid: true,
      zeroline: false
    },
    yaxis: {
      title: 'Reduction in prevalence (%)',
      showline: false,
      rangemode: 'tozero',
      autorange: true,
      zeroline: true
    }
  };


    for (var scenInd = 0; scenInd < n; scenInd ++)
    {
      var ts = ses.scenarios[scenInd].stats.ts;
      var dyrs = ses.scenarios[scenInd].stats.prev_reds;
      var trace = {
        x: ts,
        y: dyrs,
        mode: 'lines+markers',
        name: ses.scenarios[scenInd].label
      };
      traces.push(trace);

    }

    Plotly.newPlot('map-boxplot', traces, timeline_plot_layout, {displayModeBar: false});
    ScenarioIndex.setIndex(orgScenInd);




}

function drawMapBoxPlot(){
  var ses = SessionData.retrieveSession();
  var n = ses.scenarios.length;
  var traces = [];
  for (var i = 0; i <n; i++){
    var trace = {
      y: SessionData.nRounds(i),
      type: 'box',
      name: ses.scenarios[i].label
    };
    traces.push(trace);
  }
  var box_plot_layout = { //main layout format for plot.ly chart
    autosize: true,
    title: 'No. rounds to below 1% microfilariaemia',
    xaxis: {
      title: '',
      showgrid: false,
      zeroline: false
    },
    yaxis: {
      title: 'No. rounds',
      showline: false,
      rangemode: 'tozero',
      autorange: true,
      zeroline: true
    }
  };

  Plotly.newPlot('map-boxplot', traces, box_plot_layout, {displayModeBar: false});
}

function createTimeLine(){
  var tooltip = d3.select('#tooltip');
  var res = d3.select('#map-outputs').select('h4');
  d3.json('./assets/Ghana.json',function(err,data){
    d3.select('#slider1').call(d3.slider().axis(true).min(2016).max(2016+19).step(1)
                                 .on("slide",function(evt,value){
                                   value = value - 2016;
                                   var scenInd = ScenarioIndex.getIndex();
                                   var cRed = SessionData.reductions(scenInd,Math.floor(value)); //TODO: use correct index.
                                   var cLow = SessionData.reductions(scenInd,Math.floor(value),'low');
                                   var cMedium = SessionData.reductions(scenInd,Math.floor(value),'medium');
                                   var cHigh = SessionData.reductions(scenInd,Math.floor(value),'high');
                                   stats = reductionStatsCalc(data,cLow,cMedium,cHigh,params.covMDA);
                                   res.html(
                                     value + ' years after intervention, ' + Math.round((1-stats.reduction)*100) + '% reduction, '
                                           + numberWithCommas(Math.round(stats.doses)) + ' doses given. '
                                   );
                                   // Make the changes
                                   d3.selectAll('path')
                                     .attr("class", function(d,i) {
                                       if(i<data.features.length){
                                         return colorIU(data.features[i].properties.endemicity,
                                                        data.features[i].properties.prev,
                                                        data.features[i].properties.pop,cLow,cMedium,cHigh);
                                       }else{
                                         return colorIU(0,0,0,0,0,0);
                                       }

                                     })
                                     .on('mousemove', function(d,i) {
                                         tooltip.style("visibility", "visible").html("<h5 class='text-center'> "
                                         + data.features[i].properties.ADMIN1 + ", " + data.features[i].properties.ADMIN2 + ", "
                                         //+ data.features[i].properties.ADMIN3 + ", "
                                         + "prevalence : " + Math.round(100*data.features[i].properties.prev*cRed) + "%. "
                                         + "Population size : " + numberWithCommas(Math.round(data.features[i].properties.pop))
                                         + " </h5>");
                                     });
                                 })
                               );
  });

}

function resetSlider() {
  d3.select('#slider-div').html('');
  d3.select('#map-outputs h4').html('');
  d3.select("#slider-div").append("div").attr('id','slider1');
  createTimeLine();
}


function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function runMapSimulation(){
  setInputParams({'nMDA':40});
  var scenLabel = $('#inputScenarioLabel').val();
   //max number of mda rounds even if doing it six monthly.
  var maxN = 100;
  var runs = [];
  var progression = 0;
  fixInput();
  $('#map-progress-bar').css('width','0%');
  $('#map-progress-bar').show();
  var progress = setInterval(function()
  {

    $('#map-progress-bar').css('width',Number(progression*100/maxN)+'%');
    if (progression < maxN/3){
      endemicity = 'low';
      setInputParams({'endemicity': 5.0,'nMDA':40});
    } else if (progression < 2*maxN/3){
      endemicity = 'medium';
      setInputParams({'endemicity': 10.0,'nMDA':40});
    } else {
      endemicity = 'high';
      setInputParams({'endemicity': 15.0,'nMDA':40});
    }
    var m = new Model(800);
    m.evolveAndSaves(120.0);
    runs.push(SessionData.convertRun(m,endemicity));
    $('#roundsTest').html(progression*100/maxN + '%');
    if(progression == maxN) {
      $('#map-progress-bar').hide();
      clearInterval(progress);
      SessionData.storeResults(runs,scenLabel);
      scenarioRunStats();
      createScenarioBoxes();
      scenarioComparisonSelectVisibility();
      drawMap();
      $('#scenario-title').html(scenLabel + ' Overview');
      $('#settings-modal').modal('hide');


    } else {
      progression += 1;
    }
  }, 10);
}

function reductionStatsCalc(data,cLow,cMedium,cHigh,coverage){
  var n = data.features.length;
  var nn = 0;
  var totR=0;
  var doses = 0;
  var end = '';
  var doses_year = (params.mdaFreq==6)? 2 : 1;
  for (var i = 0; i<n; i++){
    end = data.features[i].properties.endemicity;
    prev = data.features[i].properties.prev;
    pop = data.features[i].properties.pop;

    if (end=='low'){
      totR += cLow;
      nn += 1;
      if(prev*cLow>0.01) doses += pop*coverage*doses_year;
    } else if (end=='medium'){
      totR += cMedium;
      nn += 1;
      if(prev*cMedium>0.01) doses += pop*coverage*doses_year;
    } else if (end == 'high'){
      totR += cHigh;
      nn += 1;
      if(prev*cHigh>0.01) doses += pop*coverage*doses_year;
    } else {

    }
  }
  return {'reduction': totR/nn,'doses' : doses};

}

var quantize = d3.scale.quantize()
      .domain([0, 0.2])
      .range(d3.range(9).map(function(i) { return "q" + i + "-9"; }));

var quantizeDoses = d3.scale.quantize()
      .domain([0, 100000])
      .range(d3.range(9).map(function(i) { return "q" + i + "-9"; }));

var quantizeTAS = d3.scale.quantize()
            .domain([0, 1])
            .range(d3.range(2).map(function(i) { return "qTAS" + i + "-1"; }));

function colorIU(end,prev,pop,cLow,cMedium,cHigh){
  var stat = $( "#sel-stat" ).val();
  var coverage = params.covMDA; //TODO: maybe change this??
  var doses = 0;
  if (end=='low'){
    rPrev = prev*cLow;
    pTAS = (prev*cLow<0.01);
    if(prev*cLow>0.01) doses = pop*coverage;
  } else if (end=='medium'){
    rPrev = prev*cMedium;
    pTAS = (prev*cMedium<0.01);
    if(prev*cMedium>0.01) doses = pop*coverage;
  } else if (end == 'high'){
    rPrev = prev*cHigh;
    pTAS = (prev*cHigh<0.01);
    if(prev*cHigh>0.01) doses = pop*coverage;
  } else {
    doses = 0;
    pTAS = 1;
    rPrev = 0.0;
  }
  var colClass;
  if (stat=='prev'){

    colClass = quantize(rPrev);
  } else if (stat=='pTAS'){

    colClass = quantizeTAS(pTAS);
  } else if (stat=='doses'){
    colClass = quantizeDoses(doses);
  } else {
    var colClass = quantize(0);
  }
    return "iu " + colClass;
}

function modalConfirmation(i){
  if (SessionData.ran(i)){
    ScenarioIndex.setIndex(i);
    $('#settings-modal').modal('hide');

  } else {
    runSimClick();
  }
}

function addScenarioButton(){
  //TODO: add length of scenarios function.
  var i = SessionData.numScenarios();
  ScenarioIndex.setIndex(i);
  SessionData.createNewSession();
  $('#scenario-messages').html('');
  $('#delete_scenario').addClass('hidden');
  $('#settings-modal').modal('show');
  $('#close_scenario').html('close');
  fixInput(false);
}

function runSimClick(){
  runMapSimulation();
  var res = d3.select('#map-outputs').select('h4');
}

function drawMap() {
  d3.json('./assets/Ghana.json',function(err,data){
    d3.selectAll('path')
      .attr("class", function(d,i) {
        if(i<data.features.length){
          return colorIU(data.features[i].properties.endemicity,
                         data.features[i].properties.prev,
                         data.features[i].properties.pop,1.0,1.0,1.0);
        }else{
          return colorIU(0,0,0,0,0,0);
        }

      }).on('mousemove', function(d,i) {
        d3.select('#tooltip').style("visibility", "visible").html("<h5 class='text-center'> "
        + data.features[i].properties.ADMIN1 + ", " + data.features[i].properties.ADMIN2 + ", "
        //+ data.features[i].properties.ADMIN3 + ", "
        + "prevalence : " + Math.round(100*data.features[i].properties.prev) + "%. "
        + "Population size : " + numberWithCommas(Math.round(data.features[i].properties.pop))
        + " </h5>");
      });
    });
    if(SessionData.ran(ScenarioIndex.getIndex())){
      resetSlider();
    }
}

function fixInput(fix_input){
  var curScen = ScenarioIndex.getIndex();
  if (fix_input == null){
    fix_input = true;
  }
  if (fix_input){
    $('#MDACoverage').slider('disable');
    $('#bedNetCoverage').slider('disable');
    $('#insecticideCoverage').slider('disable');
    $('#Microfilaricide').slider('disable');
    $('#Macrofilaricide').slider('disable');
    $('#sysAdherence').slider('disable');
    $('#run_scenario').hide();
    $('input:radio[name=mdaSixMonths]').attr('disabled',true);
    $('input:radio[name=mdaRegimenRadios]').attr('disabled',true);
    $('#inputScenarioLabel').attr('disabled',true);
  } else {
    $('#MDACoverage').slider('enable');
    $('#bedNetCoverage').slider('enable');
    $('#insecticideCoverage').slider('enable');
    $('#Microfilaricide').slider('enable');
    $('#Macrofilaricide').slider('enable');
    $('#sysAdherence').slider('enable');
    $('#run_scenario').show();
    $('input:radio[name=mdaSixMonths]').attr('disabled',false);
    $('input:radio[name=mdaRegimenRadios]').attr('disabled',false);
    $('#inputScenarioLabel').attr('disabled',false).val('Scenario '+(curScen+1));

  }
  if($("input[name=mdaRegimenRadios]:checked").val()==5){
    $('#custom-regimen-sliders').show();
  } else{
    $('#custom-regimen-sliders').hide();
  }
}
function setmodelParams(fixInput){
  if (fixInput == null){
    fixInput = false;
  }
  var scenInd = ScenarioIndex.getIndex();
  var ses = SessionData.retrieveSession();
  var ps = ses.scenarios[scenInd].params.inputs;
  $('#inputScenarioLabel').val(ses.scenarios[scenInd].label);
  $("#inputMDARounds").val(ps.mda);
  $('#MDACoverage').slider('setValue', Number(ps.coverage));
  $('#bedNetCoverage').slider('setValue',Number(ps.covN));
  $('#sysAdherence').val(ps.rho);
  $('#insecticideCoverage').slider('setValue', Number(ps.v_to_hR));
  $('input:radio[name=mdaSixMonths]').filter('[value='+ps.mdaSixMonths +']').prop('checked', true);
  $('input:radio[name=mdaRegimenRadios]').filter('[value='+ps.mdaRegimen +']').prop('checked', true);
  $('#Microfilaricide').slider('setValue',Number(ps.microfilaricide));
  $('#Macrofilaricide').slider('setValue',Number(ps.macrofilaricide));
  return {"mda" : $("#inputMDARounds").val(), "mdaSixMonths" : $("input:radio[name=mdaSixMonths]:checked").val(),
      "endemicity" : $('#endemicity').val(), "coverage": $("#MDACoverage").val(),
      "covN" : $('#bedNetCoverage').val(), "v_to_hR" : $('#insecticideCoverage').val(),
      "rho" : $('#sysAdherence').val(),
      "vecCap" : $('#vectorialCapacity').val(), "vecComp" : $('#vectorialCompetence').val(),
      "vecD" : $('#vectorialDeathRate').val(), "mdaRegimen" : $("input[name=mdaRegimenRadios]:checked").val(),
      "sysComp" : $('#sysAdherence').val(), "rhoBComp" : $('#brMda').val(), "rhoCN"  : $('#bedNetMda').val(),
      "species" : $("input[name=speciesRadios]:checked").val(),
      "macrofilaricide" : $('#Macrofilaricide').val(), "microfilaricide" : $('#Microfilaricide').val()
    }
}

$(document).ready(function(){
  //first remove previous session data.
  //SessionData.deleteSession();
  var width = $('#map').width(), height=350;
  var tooltip = d3.select('#map').append('div')
      .style("visibility", "hidden")
      .attr("id","tooltip")
      .html('');
  var canvas = d3.select("#map").append("svg")
        .attr("width", width)
        .attr("height", height);

  ScenarioIndex.setIndex(0);
  if (SessionData.ran(0)){
    resetSlider();
  }
  createScenarioBoxes();
  scenarioComparisonSelectVisibility();
  drawComparisonPlot();
  $('#sel-comp-stat').change(drawComparisonPlot);
  $('#add-new-scenario').on('click',addScenarioButton);
  $('#run_scenario').on('click',modalConfirmation);
  //Draw scenario boxes.
  $('#map-progress-bar').hide();
  $( "#sel-stat" ).change(drawMap);




  queue()
      .defer(d3.json, "./assets/Ghana.json") //ETH_IUs.json
      .defer(d3.csv, "./assets/ETH_prev.csv")
      .await(ready);

  //d3.csv('/assets/ETH_prev.csv',function(d){ glob_prevs = d}); // for debugging purposes.


  function ready(error, data, prev_datas) {
            d3.select('#map').select('img').remove();
            glob_data = data; //debug this.
            glob_prevs = prev_datas;
            console.log(data.features.length + ' ' + glob_prevs.length);
            //var prevs = new Array(data.geometries.length); //data.geometries.length
            //for (i=0; i< prevs.length; i++){
            //  console.log(i);
            //  prevs[i] = glob_prevs[i].meanpMF;
            //}
            console.log(glob_data);
            var group = canvas.selectAll("g")
                .data(data.features) //data.geometries
                .enter()
                .append("g");
            //var projection = d3.geo.albers()
            //                    .center([0, 9.1])
            //                    .rotate([40.4, 0])
            //                    .parallels([0, 20])
            //                    .scale(1200 * 5)
            //                    .translate([width / 2, height / 2]);

            //var path = d3.geo.path()
            //    .projection(projection);




            var projection = d3.geo.mercator().center([-1.0,7.9]).translate([width / 2, height / 2]); //7.9465 N, -1.0232 E //Ethiopia: 9.1° N, 40.4° E
            var projection2 = d3.geo.equirectangular()
                              .center([-1.0,7.9]) //40.4,4.0
                              .scale(3000) //1500
                              .translate([width / 2, height / 2])
                              .precision(.1);
            var path = d3.geo.path().projection(projection2);
            var areas = group.append("path")
                .attr("d", path)
                .attr("id",function(d,i){return i})
                .attr("class", function(d,i) {

                  return colorIU(data.features[i].properties.endemicity,
                                 data.features[i].properties.prev,
                                 data.features[i].properties.pop,1.0,1.0,1.0);
                })
                .attr("data-prev",function(d,i){
                  if(i<data.features.length){
                    return data.features[i].properties.prev;
                  }else{
                    return Math.random();
                  }
                })
                .on('mousemove', function(d,i) {
                    tooltip.style("visibility", "visible").html("<h5 class='text-center'> "
                    + data.features[i].properties.ADMIN1 + ", " + data.features[i].properties.ADMIN2 + ", "
                    //+ data.features[i].properties.ADMIN3 + ", "
                    + "prevalence : " + Math.round(100*data.features[i].properties.prev) + "%. "
                    + "Population size : " + numberWithCommas(Math.round(data.features[i].properties.pop))
                    + " </h5>");
                })
                .on('mouseout', function() {
                    tooltip.style("visibility", "hidden");
                });
        }



});
