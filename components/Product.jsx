import Switch from '@mui/material/Switch';

function Product({ product }) {
    const label = { inputProps: { 'aria-label': 'Switch demo' } };
    return(
        <div className="h-full w-full rounded-sm flex items-center justify-between px-8">
            <p className="text-l">{ product }</p>
            <Switch {...label} defaultChecked/>
            <button className="h-full w-full border-green-500 border-2 rounded-sm hover:bg-green-500 duration-200">
                    <p className="text-l">Post Product</p>
            </button>
        </div>
    );
}

export default Product