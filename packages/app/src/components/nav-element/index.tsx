/* tslint:disable:no-empty */
import Link from 'next/link';
import Text from '../Text';
import { cn } from '../../utils';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';


type NavElementProps = {
    label: React.ReactNode;
    href: string;
    as?: string;
    scroll?: boolean;
    chiplabel?: string;
    disabled?: boolean;
    navigationStarts?: () => void;
};

const NavElement = ({
    label,
    href,
    as,
    scroll,
    disabled,
  chiplabel,
    navigationStarts = () => {},
}: NavElementProps) => {
    const router = useRouter();
    const isActive = href === router.asPath || (as && as === router.asPath);
    const divRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (divRef.current) {
            if (chiplabel!=="isLogo") {
                divRef.current.className = cn(
                  'transition-all duration-300 ease-out ',
                  isActive
                    ? 'bg-shrub-grey-900 text-shrub-green rounded-btn font-semibold px-[12px] py-[8px]'
                    : 'group-hover:bg-shrub-grey-900 hover:text-shrub-green rounded-btn px-[12px] py-[8px]',
                );
            }

        }
    }, [isActive, chiplabel]);


    return (
        <Link
            href={href}
            as={as}
            scroll={scroll}
            // @ts-ignore
            chiplabel={chiplabel}
            passHref
            className={cn(
                'group flex h-full flex-col items-center justify-between text-white',
                disabled &&
                    'pointer-events-none cursor-not-allowed opacity-50'
            )}
            onClick={() => navigationStarts()}
        >
            {/*logo*/}
            <div className="flex flex-row items-center gap-3" ref={divRef} >
                {chiplabel!=="isLogo"? <Text className="text-lg font-medium btn-sm px-5 py-1"> {label} </Text>: <div className="mr-12 pl-10"> {label} </div>}
            </div>
        </Link>
    );
};

export default NavElement;

