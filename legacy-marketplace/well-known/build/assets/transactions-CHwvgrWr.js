import{dd as f,d7 as a,d8 as d,d6 as u}from"./app-A5SVLKDt.js";/* empty css            */const w=f`
  :host > wui-flex:first-child {
    height: 500px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }

  :host > wui-flex:first-child::-webkit-scrollbar {
    display: none;
  }
`;var p=function(n,t,i,o){var l=arguments.length,e=l<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")e=Reflect.decorate(n,t,i,o);else for(var s=n.length-1;s>=0;s--)(r=n[s])&&(e=(l<3?r(e):l>3?r(t,i,e):r(t,i))||e);return l>3&&e&&Object.defineProperty(t,i,e),e};let c=class extends a{render(){return d`
      <wui-flex flexDirection="column" .padding=${["0","3","3","3"]} gap="3">
        <w3m-activity-list page="activity"></w3m-activity-list>
      </wui-flex>
    `}};c.styles=w;c=p([u("w3m-transactions-view")],c);export{c as W3mTransactionsView};
